import { inngest } from "@/lib/inngest";
import { analysisService } from "@/modules/analysis/services/analysis.service";
import { resend, EMAIL_CONFIG } from "@/lib/resend";
import { APP_URL } from "@/constants";
export const processAnalysisJob = inngest.createFunction(
  {
    id: "process-analysis",
    name: "Process Resume Analysis",
    retries: 3,

    concurrency: { limit: 5 },
  },
  { event: "analysis/requested" },
  async ({ event, step }) => {
    const { analysisId } = event.data;
    await step.run("run-ai-analysis", async () => {
      await analysisService.processAnalysis(analysisId);
    });
    return { analysisId, status: "completed" };
  }
);
export const sendAnalysisCompleteEmailJob = inngest.createFunction(
  {
    id: "send-analysis-complete-email",
    name: "Send Analysis Complete Email",
    retries: 2,
  },
  { event: "email/send-analysis-complete" },
  async ({ event, step }) => {
    const { email, name, analysisId, atsScore } = event.data;
    await step.run("send-email", async () => {
      await resend.emails.send({
        from: EMAIL_CONFIG.from,
        to: email,
        subject: `Your resume analysis is ready — ATS Score: ${atsScore}/100`,
        html: buildAnalysisCompleteEmail(name, analysisId, atsScore),
      });
    });
    return { email, analysisId };
  }
);
export const sendWelcomeEmailJob = inngest.createFunction(
  {
    id: "send-welcome-email",
    name: "Send Welcome Email",
    retries: 2,
  },
  { event: "email/send-welcome" },
  async ({ event, step }) => {
    const { email, name } = event.data;

    await step.sleep("wait-before-welcome", "5m");
    await step.run("send-email", async () => {
      await resend.emails.send({
        from: EMAIL_CONFIG.from,
        to: email,
        subject: `Welcome to ResumeRank AI, ${name}!`,
        html: buildWelcomeEmail(name),
      });
    });
    return { email };
  }
);

function buildAnalysisCompleteEmail(name: string, analysisId: string, atsScore: number): string {
  const scoreColor = atsScore >= 80 ? "#22c55e" : atsScore >= 60 ? "#eab308" : atsScore >= 40 ? "#f97316" : "#ef4444";
  const scoreLabel = atsScore >= 80 ? "Excellent" : atsScore >= 60 ? "Good" : atsScore >= 40 ? "Needs work" : "Critical issues";
  const analysisUrl = `${APP_URL}/history/${analysisId}`;
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background: #ffffff;">
      <div style="text-align: center; margin-bottom: 32px;">
        <div style="display: inline-flex; align-items: center; gap: 8px; margin-bottom: 8px;">
          <div style="width: 32px; height: 32px; background: #6366f1; border-radius: 8px; display: flex; align-items: center; justify-content: center;">
            <span style="color: white; font-size: 16px;">✦</span>
          </div>
          <span style="font-size: 18px; font-weight: 700; color: #1a1a1a;">ResumeRank AI</span>
        </div>
      </div>
      <h1 style="color: #1a1a1a; font-size: 24px; font-weight: 700; margin: 0 0 8px;">
        Your analysis is ready, ${name}!
      </h1>
      <p style="color: #6b7280; font-size: 16px; line-height: 1.6; margin: 0 0 32px;">
        Your resume has been analyzed. Here's your ATS score:
      </p>
      <div style="text-align: center; background: #f9fafb; border-radius: 16px; padding: 32px; margin-bottom: 32px;">
        <div style="font-size: 72px; font-weight: 800; color: ${scoreColor}; line-height: 1;">${atsScore}</div>
        <div style="font-size: 16px; color: #6b7280; margin-top: 4px;">ATS Score · ${scoreLabel}</div>
      </div>
      <a href="${analysisUrl}"
         style="display: block; text-align: center; background: #6366f1; color: white; padding: 14px 28px; border-radius: 10px; text-decoration: none; font-size: 16px; font-weight: 600; margin-bottom: 24px;">
        View Full Analysis →
      </a>
      <p style="color: #9ca3af; font-size: 13px; text-align: center; margin: 0;">
        You'll find skill gaps, recommendations, and AI-suggested rewrites in your full report.
      </p>
      <hr style="border: none; border-top: 1px solid #f3f4f6; margin: 32px 0;" />
      <p style="color: #d1d5db; font-size: 12px; text-align: center; margin: 0;">
        ResumeRank AI · <a href="${APP_URL}" style="color: #d1d5db;">${APP_URL}</a>
      </p>
    </div>
  `;
}
function buildWelcomeEmail(name: string): string {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background: #ffffff;">
      <div style="text-align: center; margin-bottom: 32px;">
        <div style="display: inline-flex; align-items: center; gap: 8px;">
          <div style="width: 32px; height: 32px; background: #6366f1; border-radius: 8px; display: inline-flex; align-items: center; justify-content: center;">
            <span style="color: white; font-size: 16px;">✦</span>
          </div>
          <span style="font-size: 18px; font-weight: 700; color: #1a1a1a;">ResumeRank AI</span>
        </div>
      </div>
      <h1 style="color: #1a1a1a; font-size: 24px; font-weight: 700; margin: 0 0 12px;">
        Welcome aboard, ${name}! 👋
      </h1>
      <p style="color: #6b7280; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
        You're all set to start optimizing your resume with AI. Here's how to get your first analysis:
      </p>
      <div style="space-y: 16px; margin-bottom: 32px;">
        ${[
          ["01", "Upload your resume", "PDF or DOCX, up to 5MB"],
          ["02", "Paste a job description", "Any role from any job board"],
          ["03", "Get your AI analysis", "ATS score, skill gaps, rewrites — in 30 seconds"],
        ]
          .map(
            ([n, title, desc]) => `
          <div style="display: flex; align-items: flex-start; gap: 16px; padding: 16px 0; border-bottom: 1px solid #f3f4f6;">
            <div style="min-width: 40px; height: 40px; background: #f0f0ff; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; color: #6366f1; font-size: 14px;">${n}</div>
            <div>
              <p style="margin: 0 0 4px; font-weight: 600; color: #1a1a1a;">${title}</p>
              <p style="margin: 0; color: #9ca3af; font-size: 14px;">${desc}</p>
            </div>
          </div>
        `
          )
          .join("")}
      </div>
      <a href="${APP_URL}/analyze"
         style="display: block; text-align: center; background: #6366f1; color: white; padding: 14px 28px; border-radius: 10px; text-decoration: none; font-size: 16px; font-weight: 600; margin-bottom: 24px;">
        Run Your First Analysis →
      </a>
      <p style="color: #9ca3af; font-size: 13px; text-align: center; margin: 0;">
        You have 3 free analyses on your Free plan. No credit card required.
      </p>
      <hr style="border: none; border-top: 1px solid #f3f4f6; margin: 32px 0;" />
      <p style="color: #d1d5db; font-size: 12px; text-align: center; margin: 0;">
        ResumeRank AI · <a href="${APP_URL}" style="color: #d1d5db;">${APP_URL}</a>
        <br>If you didn't create this account, you can safely ignore this email.
      </p>
    </div>
  `;
}
