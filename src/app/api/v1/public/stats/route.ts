import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const revalidate = 3600;
export async function GET() {
  try {
    const [totalUsers, totalAnalyses, avgAtsResult] = await Promise.all([
      db.user.count({ where: { deletedAt: null } }),
      db.resumeAnalysis.count({ where: { deletedAt: null, status: "COMPLETED" } }),
      db.resumeAnalysis.aggregate({
        where: { status: "COMPLETED", deletedAt: null },
        _avg: { atsScore: true },
      }),
    ]);
    const avgAtsScore = Math.round(avgAtsResult._avg.atsScore ?? 0);
    return NextResponse.json(
      {
        success: true,
        data: {
          totalUsers,
          totalAnalyses,
          avgAtsScore,
        },
      },
      {
        headers: {

          "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
        },
      }
    );
  } catch {

    return NextResponse.json(
      { success: false, data: null },
      { status: 500 }
    );
  }
}
