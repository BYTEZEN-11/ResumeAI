import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { webhookService } from "@/modules/webhooks/services/webhook.service";
import { z } from "zod";
import type { WebhookEvent } from "@prisma/client";
import {
  successResponse,
  handleApiError,
  unauthorizedResponse,
  validationErrorResponse,
} from "@/shared/utils/api-response";
import { ZodError } from "zod";
import { assertSafeUrl } from "@/lib/ssrf-guard";
const createSchema = z.object({
  name: z.string().min(1).max(80),

  url: z
    .string()
    .url("Must be a valid HTTPS URL")
    .max(2048, "Webhook URL is too long (max 2048 chars)")
    .refine((u) => u.startsWith("https://"), "Webhook URL must use HTTPS"),
  events: z
    .array(z.enum(["ANALYSIS_COMPLETE", "ANALYSIS_FAILED", "SUBSCRIPTION_UPDATED"]))
    .min(1, "Select at least one event"),
});

export async function GET(_req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return unauthorizedResponse();
  try {
    const hooks = await webhookService.listWebhooks(session.user.id);
    return successResponse(hooks, "Webhooks retrieved");
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return unauthorizedResponse();
  try {
    const body = await req.json();
    const validated = createSchema.parse(body);

    try {
      await assertSafeUrl(validated.url);
    } catch (e) {
      return validationErrorResponse(
        new ZodError([
          {
            code: "custom",
            path: ["url"],
            message: e instanceof Error ? e.message : "URL is not safe",
          },
        ])
      );
    }
    const hook = await webhookService.createWebhook(session.user.id, {
      name: validated.name,
      url: validated.url,
      events: validated.events as WebhookEvent[],
    });

    return successResponse(
      {
        id: hook.id,
        name: hook.name,
        url: hook.url,
        events: hook.events,
        secret: hook.secret,
        createdAt: hook.createdAt,
      },
      "Webhook created. Copy the secret now — it will not be shown again.",
      undefined,
      201
    );
  } catch (error) {
    if (error instanceof ZodError) return validationErrorResponse(error);
    return handleApiError(error);
  }
}
