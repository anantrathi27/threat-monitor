import { NextRequest, NextResponse } from "next/server";

// Routes that require authentication
const PROTECTED = ["/dashboard", "/threats", "/alerts", "/analytics"];
// Routes accessible only when NOT logged in
const AUTH_ONLY = ["/login", "/register"];

// Simple in-memory rate limiting store (use Redis in production)
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(ip: string, limit = 100, windowMs = 60_000): boolean {
  const now = Date.now();
  const entry = rateLimitStore.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(ip, { count: 1, resetAt: now + windowMs });
    return false;
  }
  entry.count++;
  if (entry.count > limit) return true;
  return false;
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";

  // ── Rate limiting on API routes ────────────────────────────
  if (pathname.startsWith("/api/")) {
    const limited = isRateLimited(`${ip}:${pathname}`, 60, 60_000);
    if (limited) {
      return NextResponse.json(
        { detail: "Too many requests" },
        { status: 429, headers: { "Retry-After": "60" } }
      );
    }
  }

  // ── Auth guard: protected routes ──────────────────────────
  const token = req.cookies.get("cs_token")?.value
    || req.headers.get("authorization")?.replace("Bearer ", "");

  const isProtected = PROTECTED.some(p => pathname.startsWith(p));
  const isAuthOnly  = AUTH_ONLY.some(p => pathname.startsWith(p));

  if (isProtected && !token) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (isAuthOnly && token) {
    const url = req.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  // ── Security headers ──────────────────────────────────────
  const res = NextResponse.next();
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");

  return res;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|public).*)",
  ],
};
