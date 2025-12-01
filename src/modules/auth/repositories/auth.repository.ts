import { db } from "@/lib/db";
import type { User } from "@prisma/client";
import bcrypt from "bcryptjs";

function normalize(email: string): string {
  return email.trim().toLowerCase();
}
export class AuthRepository {
  async findByEmail(email: string): Promise<User | null> {
    return db.user.findUnique({
      where: { emailNormalized: normalize(email) },
    });
  }
  async findById(id: string): Promise<User | null> {
    return db.user.findUnique({
      where: { id, deletedAt: null },
    });
  }
  async createUser(data: {
    name: string;
    email: string;
    password: string;
  }): Promise<User> {
    const passwordHash = await bcrypt.hash(data.password, 12);
    const emailNorm = normalize(data.email);
    return db.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: data.name,
          email: data.email,
          emailNormalized: emailNorm,
          passwordHash,
        },
      });
      await tx.profile.create({
        data: { userId: user.id },
      });
      await tx.subscription.create({
        data: {
          userId: user.id,
          plan: "FREE",
          analysesLimit: 3,
        },
      });
      return user;
    });
  }
  async updateLastLogin(userId: string): Promise<void> {
    await db.user.update({
      where: { id: userId },
      data: { lastLoginAt: new Date() },
    });
  }
  async updatePassword(userId: string, password: string): Promise<void> {
    const passwordHash = await bcrypt.hash(password, 12);
    await db.user.update({
      where: { id: userId },
      data: { passwordHash },
    });
  }
  async isEmailTaken(email: string): Promise<boolean> {
    const user = await db.user.findUnique({
      where: { emailNormalized: normalize(email) },
      select: { id: true },
    });
    return !!user;
  }
}
export const authRepository = new AuthRepository();
