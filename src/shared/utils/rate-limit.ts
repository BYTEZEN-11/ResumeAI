import { NextRequest } from "next/server";
export type RateLimitConfig = {
  limit: number;
  windowMs: number;
};
export type RateLimitResult = {
  success: boolean;
  remaining: number;
  resetAt: number;
  limit: number;
  reset: number;
};

function buildKey(req: NextRequest): string {
  const trustProxy = process.env.TRUST_PROXY === "true";

  const xff = req.headers.get("x-forwarded-for");
  const realIp = req.headers.get("x-real-ip");
  const ip =
    (realIp ?? "")
    ?? (trustProxy ? xff?.split(",")[0]?.trim() : undefined)
    ?? "unknown";

  const userId = req.headers.get("x-rr-user-id") ?? "anon";

  const path = req.nextUrl.pathname.replace(/\/$/, "") || "/";
  return `rl:${ip}:${userId}:${path}`;
}

type MemEntry = { count: number; resetAt: number };
const memStore = new Map<string, MemEntry>();

if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of memStore.entries()) {
      if (now > entry.resetAt) memStore.delete(key);
    }
  }, 60_000);
}
function memRateLimit(key: string, config: RateLimitConfig): RateLimitResult {
  const now = Date.now();
  const entry = memStore.get(key);
  if (!entry || now > entry.resetAt) {
    const resetAt = now + config.windowMs;
    memStore.set(key, { count: 1, resetAt });
    return {
      success: true,
      remaining: config.limit - 1,
      resetAt,
      limit: config.limit,
      reset: Math.ceil(resetAt / 1000),
    };
  }
  if (entry.count >= config.limit) {
    return {
      success: false,
      remaining: 0,
      resetAt: entry.resetAt,
      limit: config.limit,
      reset: Math.ceil(entry.resetAt / 1000),
    };
  }
  entry.count += 1;
  return {
    success: true,
    remaining: config.limit - entry.count,
    resetAt: entry.resetAt,
    limit: config.limit,
    reset: Math.ceil(entry.resetAt / 1000),
  };
}

const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const isRedisConfigured = !!(UPSTASH_URL && UPSTASH_TOKEN);
async function redisRateLimit(
  key: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const windowSec = Math.ceil(config.windowMs / 1000);
  const now = Date.now();
  const resetAt = now + config.windowMs;
  try {

    const response = await fetch(`${UPSTASH_URL}/pipeline`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${UPSTASH_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify([
        ["INCR", key],
        ["EXPIRE", key, windowSec, "NX"],
      ]),
    });
    if (!response.ok) {

      return memRateLimit(key, config);
    }
    const results = (await response.json()) as [
      { result: number },
      { result: number },
    ];
    const count = results[0]?.result ?? 1;
    const reset = Math.ceil(resetAt / 1000);
    if (count > config.limit) {
      return {
        success: false,
        remaining: 0,
        resetAt,
        limit: config.limit,
        reset,
      };
    }
    return {
      success: true,
      remaining: Math.max(0, config.limit - count),
      resetAt,
      limit: config.limit,
      reset,
    };
  } catch {

    return memRateLimit(key, config);
  }
}

export function addRateLimitHeaders(
  response: Response,
  result: RateLimitResult
): Response {
  response.headers.set("X-RateLimit-Limit", result.limit.toString());
  response.headers.set("X-RateLimit-Remaining", result.remaining.toString());
  response.headers.set("X-RateLimit-Reset", result.reset.toString());

  if (!result.success) {
    const retryAfter = Math.max(0, result.reset - Math.floor(Date.now() / 1000));
    response.headers.set("Retry-After", retryAfter.toString());
  }
  return response;
}
export async function rateLimit(
  req: NextRequest,
  config: RateLimitConfig = { limit: 100, windowMs: 60_000 }
): Promise<RateLimitResult> {
  const key = buildKey(req);
  if (isRedisConfigured) {
    return redisRateLimit(key, config);
  }
  return memRateLimit(key, config);
}
