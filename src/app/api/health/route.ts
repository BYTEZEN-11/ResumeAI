import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { openai } from "@/lib/openai";
export async function GET() {
  const start = Date.now();
  const checks: Record<string, { status: string; latencyMs?: number; error?: string }> = {};
  let overallStatus = "healthy";

  try {
    const dbStart = Date.now();
    await db.$queryRaw`SELECT 1`;
    checks.database = {
      status: "healthy",
      latencyMs: Date.now() - dbStart,
    };
  } catch (error) {
    checks.database = {
      status: "unhealthy",
      error: error instanceof Error ? error.message : "Connection failed",
    };
    overallStatus = "unhealthy";
  }

  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    try {
      const redisStart = Date.now();
      const response = await fetch(`${process.env.UPSTASH_REDIS_REST_URL}/ping`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`,
        },
      });
      if (response.ok) {
        checks.redis = {
          status: "healthy",
          latencyMs: Date.now() - redisStart,
        };
      } else {
        checks.redis = {
          status: "unhealthy",
          error: `HTTP ${response.status}`,
        };
        overallStatus = "degraded";
      }
    } catch (error) {
      checks.redis = {
        status: "unhealthy",
        error: error instanceof Error ? error.message : "Connection failed",
      };
      overallStatus = "degraded";
    }
  } else {
    checks.redis = { status: "not_configured" };
  }

  try {
    const openaiStart = Date.now();

    await openai.models.list();
    checks.openai = {
      status: "healthy",
      latencyMs: Date.now() - openaiStart,
    };
  } catch (error) {
    checks.openai = {
      status: "unhealthy",
      error: error instanceof Error ? error.message : "API call failed",
    };
    overallStatus = "degraded";
  }

  if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
    try {
      const supabaseStart = Date.now();
      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/`, {
        method: "HEAD",
        headers: {
          apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
        },
      });
      if (response.ok || response.status === 401) {
        checks.supabase = {
          status: "healthy",
          latencyMs: Date.now() - supabaseStart,
        };
      } else {
        checks.supabase = {
          status: "unhealthy",
          error: `HTTP ${response.status}`,
        };
        overallStatus = "degraded";
      }
    } catch (error) {
      checks.supabase = {
        status: "unhealthy",
        error: error instanceof Error ? error.message : "Connection failed",
      };
      overallStatus = "degraded";
    }
  }
  const totalLatency = Date.now() - start;
  const statusCode = overallStatus === "healthy" ? 200 : overallStatus === "degraded" ? 200 : 503;
  return NextResponse.json(
    {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version ?? "1.0.0",
      uptime: process.uptime(),
      latencyMs: totalLatency,
      checks,
    },
    { status: statusCode }
  );
}
