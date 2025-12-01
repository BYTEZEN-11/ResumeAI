import { Inngest } from "inngest";
export const inngest = new Inngest({
  id: "resume-rank-ai",
  name: "ResumeRank AI",
  eventKey: process.env.INNGEST_EVENT_KEY,
});

export type InngestEvents = {
  "analysis/requested": {
    data: {
      analysisId: string;
      userId: string;
      resumeId: string;
      jobDescriptionId: string;
    };
  };
  "email/send-welcome": {
    data: {
      userId: string;
      email: string;
      name: string;
    };
  };
  "email/send-analysis-complete": {
    data: {
      userId: string;
      email: string;
      name: string;
      analysisId: string;
      atsScore: number;
    };
  };
  "subscription/updated": {
    data: {
      userId: string;
      plan: string;
    };
  };
};
