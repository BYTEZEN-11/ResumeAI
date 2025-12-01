import { authRepository } from "@/modules/auth/repositories/auth.repository";
import { resend, EMAIL_CONFIG } from "@/lib/resend";
import { inngest } from "@/lib/inngest";
import { APP_URL } from "@/constants";
import { db } from "@/lib/db";
import crypto from "crypto";

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}
export class AuthService {
  async register(data: { name: string; email: string; password: string }) {
    const emailTaken = await authRepository.isEmailTaken(data.email);
    if (emailTaken) {
      throw new Error("An account with this email already exists");
    }
    if (!data.password || data.password.length < 8) {
      throw new Error("Password must be at least 8 characters long");
    }
    const user = await authRepository.createUser(data);

    inngest
      .send({
        name: "email/send-welcome",
        data: { userId: user.id, email: user.email, name: user.name ?? "" },
      })
      .catch(() => {
        console.error("Failed to queue welcome email job for:", user.email);
      });
    return user;
  }
  async sendPasswordResetEmail(email: string): Promise<void> {
    const user = await authRepository.findByEmail(email);
    if (!user) {

      return;
    }
    const token = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 60 * 60 * 1000);
    const tokenHash = hashToken(`reset_${token}`);

    await db.verificationToken.deleteMany({
      where: { identifier: email },
    });
    await db.verificationToken.create({
      data: {
        identifier: email,
        token: tokenHash,
        expires,
      },
    });
    const resetUrl = `${APP_URL}/auth/reset-password?token=${token}&email=${encodeURIComponent(email)}`;
    await resend.emails.send({
      from: EMAIL_CONFIG.from,
      to: email,
      subject: "Reset your ResumeRank AI password",
      html: this.resetPasswordEmailHtml(user.name ?? "", resetUrl),
    });
  }
  async resetPassword(email: string, token: string, password: string): Promise<void> {
    const tokenHash = hashToken(`reset_${token}`);
    const verificationToken = await db.verificationToken.findFirst({
      where: { identifier: email, token: tokenHash },
    });
    if (!verificationToken) {
      throw new Error("Invalid or expired reset token");
    }
    if (new Date() > verificationToken.expires) {
      await db.verificationToken.deleteMany({ where: { identifier: email } });
      throw new Error("Reset token has expired");
    }
    const user = await authRepository.findByEmail(email);
    if (!user) throw new Error("User not found");
    await authRepository.updatePassword(user.id, password);

    await db.user.update({
      where: { id: user.id },
      data: { tokenInvalidatedAt: new Date() },
    });
    await db.verificationToken.deleteMany({ where: { identifier: email } });
  }

  private resetPasswordEmailHtml(name: string, resetUrl: string): string {
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
        <h1 style="color: #1a1a1a; font-size: 24px; font-weight: 700; margin: 0 0 8px;">
          Reset your password
        </h1>
        <p style="color: #6b7280; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
          Hi ${name}, we received a request to reset your password. Click the button below to proceed.
        </p>
        <a href="${resetUrl}"
           style="display: inline-block; background: #6366f1; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-size: 16px; margin-top: 20px;">
          Reset Password
        </a>
        <p style="color: #888; font-size: 14px; margin-top: 20px;">
          This link expires in 1 hour. If you didn't request this, ignore this email.
        </p>
      </div>
    `;
  }
}
export const authService = new AuthService();
