import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { webhookService } from "@/modules/webhooks/services/webhook.service";
import {
  successResponse,
  handleApiError,
  unauthorizedResponse,
} from "@/shared/utils/api-response";
type Params = { params: Promise<{ id: string }> };
export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return unauthorizedResponse();
  try {
    const { id } = await params;
    await webhookService.deleteWebhook(id, session.user.id);
    return successResponse(null, "Webhook deleted");
  } catch (error) {
    return handleApiError(error);
  }
}
export async function GET(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return unauthorizedResponse();
  try {
    const { id } = await params;
    const deliveries = await webhookService.getDeliveries(id, session.user.id);
    return successResponse(deliveries, "Deliveries retrieved");
  } catch (error) {
    return handleApiError(error);
  }
}
