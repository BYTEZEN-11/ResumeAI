import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { billingService } from "@/modules/billing/services/billing.service";
import {
  successResponse,
  handleApiError,
  unauthorizedResponse,
} from "@/shared/utils/api-response";
export async function POST(_req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return unauthorizedResponse();
  try {
    const url = await billingService.createPortalSession(session.user.id);
    return successResponse({ url }, "Portal session created");
  } catch (error) {
    return handleApiError(error);
  }
}
