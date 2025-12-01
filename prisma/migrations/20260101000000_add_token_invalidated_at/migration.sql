-- Add `tokenInvalidatedAt` to `users` for JWT revocation.
-- SECURITY: the JWT callback in src/auth.ts compares the token's `iat`
-- against this timestamp. When a user's password changes or their
-- account is deleted, this field is bumped to the current time,
-- invalidating every previously-minted JWT.

ALTER TABLE "users"
  ADD COLUMN "tokenInvalidatedAt" TIMESTAMP(3);
