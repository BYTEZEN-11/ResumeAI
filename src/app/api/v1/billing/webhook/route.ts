import { NextRequest } from "next/server";
import { billingService } from "@/modules/billing/services/billing.service";
import { errorResponse } from "@/shared/utils/api-response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(req: NextRequest) {
  const payload = await req.text();
  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return errorResponse("Missing stripe-signature header", 400);
  }
  try {
    await billingService.handleWebhook(payload, signature);
    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Webhook error";

    return errorResponse(message, 400);
  }
}
