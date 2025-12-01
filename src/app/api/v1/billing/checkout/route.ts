import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { billingService } from "@/modules/billing/services/billing.service";
import { z } from "zod";
import {
  successResponse,
  handleApiError,
  unauthorizedResponse,
  validationErrorResponse,
} from "@/shared/utils/api-response";
import { ZodError } from "zod";
const checkoutSchema = z.object({
  plan: z.enum(["PRO", "TEAM"]),
});
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return unauthorizedResponse();
  try {
    const body = await req.json();
    const validated = checkoutSchema.parse(body);
    const url = await billingService.createCheckoutSession(session.user.id, validated.plan);
    return successResponse({ url }, "Checkout session created");
  } catch (error) {
    if (error instanceof ZodError) return validationErrorResponse(error);
    return handleApiError(error);
  }
}
