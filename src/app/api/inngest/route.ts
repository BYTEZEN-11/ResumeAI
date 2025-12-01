import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest";
import {
  processAnalysisJob,
  sendAnalysisCompleteEmailJob,
  sendWelcomeEmailJob,
} from "@/modules/analysis/jobs/analysis.job";

const signingKey = process.env.INNGEST_SIGNING_KEY;
if (process.env.NODE_ENV !== "development" && !signingKey) {
  throw new Error(
    "INNGEST_SIGNING_KEY is required outside of development. Set it from your Inngest dashboard."
  );
}
export const { GET, POST, PUT } = serve({
  client: inngest,
  ...(signingKey ? { signingKey } : {}),
  functions: [
    processAnalysisJob,
    sendAnalysisCompleteEmailJob,
    sendWelcomeEmailJob,
  ],
});
