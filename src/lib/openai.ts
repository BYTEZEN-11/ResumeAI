import "server-only";
import OpenAI from "openai";
const rawKey = process.env.OPENAI_API_KEY;

if (process.env.NODE_ENV === "production" && !rawKey) {
  throw new Error(
    "OPENAI_API_KEY is required in production. Set it in your environment."
  );
}

export const openai = new OpenAI({
  apiKey: rawKey ?? "sk-placeholder-not-for-production",
});
const ALLOWED_ANALYSIS_MODELS = new Set(["gpt-4o-mini", "gpt-4o", "gpt-4-turbo"]);
const ALLOWED_REWRITE_MODELS = new Set(["gpt-4o", "gpt-4-turbo"]);
const ALLOWED_EMBEDDING_MODELS = new Set([
  "text-embedding-3-small",
  "text-embedding-3-large",
  "text-embedding-ada-002",
]);
function validateModel(value: string, allowed: Set<string>, fallback: string): string {
  if (allowed.has(value)) return value;
  if (process.env.NODE_ENV === "production") {
    throw new Error(`Model "${value}" is not in the allowlist. Allowed: ${[...allowed].join(", ")}`);
  }
  return fallback;
}
export const AI_MODELS = {
  analysis: validateModel(process.env.OPENAI_MODEL ?? "gpt-4o-mini", ALLOWED_ANALYSIS_MODELS, "gpt-4o-mini"),
  rewrite: validateModel(process.env.OPENAI_REWRITE_MODEL ?? "gpt-4o", ALLOWED_REWRITE_MODELS, "gpt-4o"),
  embedding: validateModel(process.env.OPENAI_EMBEDDING_MODEL ?? "text-embedding-3-small", ALLOWED_EMBEDDING_MODELS, "text-embedding-3-small"),
} as const;
