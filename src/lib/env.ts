import { z } from "zod";
const envSchema = z.object({

  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  NEXT_PUBLIC_APP_URL: z.string().url(),
  NEXT_PUBLIC_APP_NAME: z.string().default("ResumeRank AI"),

  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  DIRECT_URL: z.string().min(1, "DIRECT_URL is required"),

  AUTH_SECRET: z.string().min(32, "AUTH_SECRET must be at least 32 characters"),
  AUTH_URL: z.string().url().default("http://localhost:3000"),
  IMPERSONATION_SECRET: z.string().min(32, "IMPERSONATION_SECRET must be at least 32 characters"),

  AUTH_GOOGLE_ID: z.string().optional(),
  AUTH_GOOGLE_SECRET: z.string().optional(),
  AUTH_GITHUB_ID: z.string().optional(),
  AUTH_GITHUB_SECRET: z.string().optional(),

  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  SUPABASE_STORAGE_BUCKET: z.string().default("resumes"),

  OPENAI_API_KEY: z.string().startsWith("sk-", "OPENAI_API_KEY must start with sk-"),
  OPENAI_MODEL: z.string().default("gpt-4o-mini"),
  OPENAI_REWRITE_MODEL: z.string().default("gpt-4o"),
  OPENAI_EMBEDDING_MODEL: z.string().default("text-embedding-3-small"),

  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().startsWith("pk_"),
  STRIPE_SECRET_KEY: z.string().startsWith("sk_"),
  STRIPE_WEBHOOK_SECRET: z.string().startsWith("whsec_"),
  WEBHOOK_RETRY_SECRET: z.string().min(32, "Webhook retry secret must be at least 32 characters"),

  WEBHOOK_ENCRYPTION_KEY: z.string().min(1, "WEBHOOK_ENCRYPTION_KEY is required"),
  STRIPE_PRO_PRICE_ID: z.string().startsWith("price_"),
  STRIPE_TEAM_PRICE_ID: z.string().startsWith("price_"),

  RESEND_API_KEY: z.string().startsWith("re_"),
  RESEND_FROM_EMAIL: z.string().email().default("noreply@resumerank.ai"),
  RESEND_FROM_NAME: z.string().default("ResumeRank AI"),

  INNGEST_EVENT_KEY: z.string().min(1),
  INNGEST_SIGNING_KEY: z.string().startsWith("signkey-"),

  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
  REDIS_URL: z.string().optional(),

  RATE_LIMIT_REQUESTS: z.coerce.number().default(100),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(60000),

  ENABLE_OCR: z.coerce.boolean().default(false),
  ENABLE_TEAM_WORKSPACE: z.coerce.boolean().default(true),
  ENABLE_VIRUS_SCAN: z.coerce.boolean().default(false),
});
export type Env = z.infer<typeof envSchema>;
export function validateEnv(): Env {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const errors = result.error.errors.map((err) => {
      return `  ❌ ${err.path.join(".")}: ${err.message}`;
    });
    console.error("\n🚨 Environment variable validation failed:\n");
    console.error(errors.join("\n"));
    console.error("\nPlease check your .env.local file and ensure all required variables are set.");
    console.error("Reference: .env.example\n");

    const failing = result.error.errors
      .map((e) => e.path.join("."))
      .filter(Boolean)
      .join(", ");
    throw new Error(
      `Invalid environment variables — failed: ${failing || "(see console)"}`
    );
  }
  return result.data;
}
export const env = validateEnv();
