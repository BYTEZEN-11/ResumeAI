import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { billingService } from "@/modules/billing/services/billing.service";
import {
  successResponse,
  handleApiError,
  unauthorizedResponse,
} from "@/shared/utils/api-response";
export async function GET(_req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return unauthorizedResponse();
  try {
    const [subscription, payments] = await Promise.all([
      billingService.getSubscription(session.user.id),
      billingService.getPaymentHistory(session.user.id),
    ]);
    return successResponse({ subscription, payments }, "Billing info retrieved");
  } catch (error) {
    return handleApiError(error);
  }
}
