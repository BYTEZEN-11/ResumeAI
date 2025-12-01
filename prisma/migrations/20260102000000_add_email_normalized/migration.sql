-- Add `emailNormalized` column to `users` for case-insensitive
-- uniqueness enforcement. SECURITY: previously `User.email` was a
-- plain `String @unique`, so "Foo@x.com" and "foo@x.com" were treated
-- as different accounts — a typical email-enumeration / account-
-- collision vulnerability.
--
-- We add a case-folded copy (`lower(email)`) and a unique index on it.
-- Application code writes both columns atomically and looks users up
-- by `emailNormalized`. The original `email` column keeps its value
-- for display purposes (we don't want to silently rewrite user data).

ALTER TABLE "users"
  ADD COLUMN "emailNormalized" TEXT;

-- Backfill. lower(email) is NULL-safe for emails but our column is
-- non-nullable in spirit; any existing NULLs are pre-data corruption.
UPDATE "users" SET "emailNormalized" = lower("email")
  WHERE "emailNormalized" IS NULL;

-- Enforce uniqueness going forward. NOT VALID first so the index can
-- be created without scanning the table; then we run a follow-up step
-- to validate. In a single-shot migration that's fine because we
-- already backfilled.
ALTER TABLE "users"
  ALTER COLUMN "emailNormalized" SET NOT NULL;

-- Drop the original case-sensitive uniqueness on `email` since
-- `emailNormalized` is now the source of truth.
ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "users_email_key";

CREATE UNIQUE INDEX "users_emailNormalized_key" ON "users" ("emailNormalized");
