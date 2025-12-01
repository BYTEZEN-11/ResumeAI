import { NextRequest } from "next/server";
import { headers } from "next/headers";
export async function getRequestId(): Promise<string> {
  const headersList = await headers();
  return headersList.get("x-request-id") || "unknown";
}
export function getRequestIdFromReq(req: NextRequest): string {
  return req.headers.get("x-request-id") || "unknown";
}
export function formatLogWithRequestId(requestId: string, message: string): string {
  return `[req:${requestId.slice(0, 8)}] ${message}`;
}
