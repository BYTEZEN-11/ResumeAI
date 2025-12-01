import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Google from "next-auth/providers/google";
import GitHub from "next-auth/providers/github";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { inngest } from "@/lib/inngest";
import { loginSchema } from "@/modules/auth/schemas/auth.schema";
import type { UserRole } from "@prisma/client";
import { jwtVerify } from "jose";
const IMPERSONATION_COOKIE = "rr_impersonate";
const impersonationSecretStr = process.env.IMPERSONATION_SECRET;
if (!impersonationSecretStr) {
  throw new Error(
    "IMPERSONATION_SECRET environment variable is required. Generate one with: openssl rand -base64 32"
  );
}
const IMPERSONATION_SECRET = new TextEncoder().encode(impersonationSecretStr);
export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
  },
  pages: {
    signIn: "/auth/signin",
    signOut: "/auth/signout",
    error: "/auth/error",
    verifyRequest: "/auth/verify",
    newUser: "/onboarding",
  },
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
      allowDangerousEmailAccountLinking: false,
    }),
    GitHub({
      clientId: process.env.AUTH_GITHUB_ID!,
      clientSecret: process.env.AUTH_GITHUB_SECRET!,
      allowDangerousEmailAccountLinking: false,
    }),
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const validated = loginSchema.safeParse(credentials);
        if (!validated.success) return null;
        const { email, password } = validated.data;
        const user = await db.user.findUnique({
          where: { emailNormalized: email.toLowerCase(), deletedAt: null },
          select: {
            id: true,
            email: true,
            name: true,
            image: true,
            passwordHash: true,
            role: true,
            isActive: true,
            isBanned: true,
          },
        });
        if (!user || !user.passwordHash) return null;
        if (!user.isActive || user.isBanned) return null;
        const passwordMatch = await bcrypt.compare(password, user.passwordHash);
        if (!passwordMatch) return null;
        await db.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        });
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: UserRole }).role ?? "USER";
      }

      if (trigger === "update" && session) {
        token.name = session.name;
        token.image = session.image;
      }

      if (process.env.NEXT_RUNTIME === "edge") {
        return token;
      }

      try {
        const cookieStore = await cookies();
        const impCookie = cookieStore.get(IMPERSONATION_COOKIE)?.value;
        if (impCookie) {

          const { payload } = await jwtVerify(impCookie, IMPERSONATION_SECRET, {
            issuer: "resumerank:admin-impersonation",
            audience: "resumerank:impersonation-cookie",
          });
          const targetUserId = payload.targetUserId as string;
          const adminId = payload.adminId as string;
          const expiresAt = payload.exp! * 1000;
          if (Date.now() < expiresAt) {

            const realId = token.id as string | undefined;
            if (realId === adminId || token.adminId === adminId) {
              const target = await db.user.findUnique({
                where: { id: targetUserId, deletedAt: null },
                select: { id: true, name: true, email: true, image: true, role: true },
              });
              if (target) {
                return {
                  ...token,
                  id: target.id,
                  name: target.name,
                  email: target.email,
                  image: target.image,
                  role: target.role,
                  adminId: adminId,
                  isImpersonating: true,
                };
              }
            }
          }
        }
      } catch {

      }

      if (token.id) {
        const dbUser = await db.user.findUnique({
          where: { id: token.id as string },
          select: { role: true, isActive: true, isBanned: true, tokenInvalidatedAt: true },
        });
        if (!dbUser || !dbUser.isActive || dbUser.isBanned) {
          return { ...token, error: "AccessDenied" };
        }

        const iatMs = typeof token.iat === "number" ? token.iat * 1000 : 0;
        if (dbUser.tokenInvalidatedAt && iatMs && iatMs < dbUser.tokenInvalidatedAt.getTime()) {
          return { ...token, error: "AccessDenied" };
        }
        token.role = dbUser.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (token.error === "AccessDenied") {
        session.user.id = "";
        return session;
      }
      session.user.id = token.id as string;
      session.user.role = token.role as UserRole;

      if (token.isImpersonating) {
        (session as typeof session & { isImpersonating?: boolean; adminId?: string }).isImpersonating = true;
        (session as typeof session & { isImpersonating?: boolean; adminId?: string }).adminId = token.adminId as string;
      }
      return session;
    },
    async signIn({ user, account }) {

      if (account?.provider !== "credentials") {
        return true;
      }

      return !!user;
    },
  },
  events: {
    async createUser({ user }) {

      if (user.id) {
        await db.profile.upsert({
          where: { userId: user.id },
          update: {},
          create: { userId: user.id },
        });
        await db.subscription.upsert({
          where: { userId: user.id },
          update: {},
          create: {
            userId: user.id,
            plan: "FREE",
            analysesLimit: 3,
          },
        });

        if (user.email) {
          inngest
            .send({
              name: "email/send-welcome",
              data: {
                userId: user.id,
                email: user.email,
                name: user.name ?? "",
              },
            })
            .catch(() => {
              console.error("Failed to queue welcome email for OAuth user:", user.email);
            });
        }
      }
    },
  },
});
