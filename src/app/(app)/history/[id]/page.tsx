import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { analysisService } from "@/modules/analysis/services/analysis.service";
import { AnalysisDetail } from "@/modules/analysis/components/analysis-detail";
type Props = { params: Promise<{ id: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  return { title: `Analysis ${id.slice(0, 8)}...` };
}
export default async function AnalysisDetailPage({ params }: Props) {
  const { id } = await params;
  const session = await auth();
  try {
    const analysis = await analysisService.getAnalysis(id, session!.user.id);
    return <AnalysisDetail analysis={analysis} />;
  } catch {
    notFound();
  }
}
