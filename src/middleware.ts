import { auth } from "@/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const AUTH_ROUTES = ["/auth/signin", "/auth/signup"];
const ADMIN_ROUTES = ["/admin"];
const PROTECTED_ROUTES = ["/dashboard", "/resumes", "/analyze", "/history", "/billing", "/onboarding", "/settings"];

const CSRF_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function buildCSP(): string {
  const directives = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "connect-src 'self' https://",
    "media-src 'self' blob:",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ];
  return directives.join("; ");
}

function applySecurityHeaders(response: NextResponse, isHttps: boolean): void {

  if (isHttps) {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains"
    );
  }

  response.headers.set("X-Frame-Options", "DENY");

  response.headers.set("X-Content-Type-Options", "nosniff");

  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=()"
  );

  response.headers.set("Content-Security-Policy", buildCSP());
}
export default auth(async (req: NextRequest & { auth: { user?: { role?: string } } | null }) => {
  const { nextUrl, auth: session } = req;
  const isLoggedIn = !!session?.user;
  const userRole = session?.user?.role;
  const pathname = nextUrl.pathname;

  const requestId = req.headers.get("x-request-id") || crypto.randomUUID();

  const AUTH_EXEMPT_PATHS = [
    "/api/v1/auth/signin",
    "/api/v1/auth/callback",
    "/api/v1/auth/session",
    "/api/v1/auth/csrf",
    "/api/v1/auth/signout",
    "/api/v1/auth/verify-request",
    "/api/v1/auth/error",
    "/api/v1/auth/providers",
  ];
  if (
    pathname.startsWith("/api/v1/") &&
    pathname !== "/api/v1/billing/webhook" &&
    CSRF_METHODS.has(req.method) &&
    !AUTH_EXEMPT_PATHS.some((p) => pathname.startsWith(p))
  ) {
    if (req.headers.get("x-requested-with") !== "XMLHttpRequest") {
      return NextResponse.json(
        { success: false, message: "Missing X-Requested-With header", data: null },
        { status: 403 }
      );
    }
  }

  if (
    pathname.startsWith("/api/v1/auth") ||
    pathname.startsWith("/api/inngest") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml"
  ) {
    const response = NextResponse.next();
    response.headers.set("x-request-id", requestId);
    applySecurityHeaders(response, req.nextUrl.protocol === "https:");
    return response;
  }
  if (pathname === "/api/v1/billing/webhook") {
    const response = NextResponse.next();
    response.headers.set("x-request-id", requestId);
    applySecurityHeaders(response, req.nextUrl.protocol === "https:");
    return response;
  }

  const response = NextResponse.next();

  response.headers.set("x-request-id", requestId);

  applySecurityHeaders(response, req.nextUrl.protocol === "https:");

  if (isLoggedIn && AUTH_ROUTES.some((route) => pathname.startsWith(route))) {
    return NextResponse.redirect(new URL("/dashboard", nextUrl));
  }

  if (ADMIN_ROUTES.some((route) => pathname.startsWith(route))) {
    if (!isLoggedIn) {
      return NextResponse.redirect(new URL(`/auth/signin?callbackUrl=${pathname}`, nextUrl));
    }
    if (userRole !== "ADMIN" && userRole !== "SUPER_ADMIN") {
      return NextResponse.redirect(new URL("/dashboard?error=forbidden", nextUrl));
    }
  }

  if (PROTECTED_ROUTES.some((route) => pathname.startsWith(route))) {
    if (!isLoggedIn) {
      return NextResponse.redirect(new URL(`/auth/signin?callbackUrl=${pathname}`, nextUrl));
    }
  }

  if (pathname.startsWith("/api/v1/") && !pathname.startsWith("/api/v1/auth")) {
    if (!isLoggedIn) {
      return NextResponse.json(
        { success: false, message: "Unauthorized", data: null },
        { status: 401 }
      );
    }
  }
  return response;
});
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
