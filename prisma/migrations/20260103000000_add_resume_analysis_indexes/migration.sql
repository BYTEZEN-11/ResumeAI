-- PERFORMANCE / LOW: add missing index on ResumeAnalysis.jobDescriptionId
-- (referenced by the analyses-by-job-description listing query) and a
-- composite (userId, status, createdAt) index for the dashboard
-- "my analyses by status" filter. Without these, every dashboard load
-- does a sequential scan over resume_analyses.

CREATE INDEX IF NOT EXISTS "resume_analyses_jobDescriptionId_idx"
  ON "resume_analyses" ("jobDescriptionId");

CREATE INDEX IF NOT EXISTS "resume_analyses_userId_status_createdAt_idx"
  ON "resume_analyses" ("userId", "status", "createdAt");