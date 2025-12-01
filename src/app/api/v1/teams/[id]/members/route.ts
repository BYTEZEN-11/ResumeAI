import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import {
  successResponse,
  handleApiError,
  unauthorizedResponse,
  forbiddenResponse,
  notFoundResponse,
  validationErrorResponse,
  errorResponse,
} from "@/shared/utils/api-response";
import { resend, EMAIL_CONFIG } from "@/lib/resend";
import { APP_URL } from "@/constants";
import { ZodError } from "zod";
type Params = { params: Promise<{ id: string }> };
const inviteSchema = z.object({
  email: z.string().email("Invalid email address"),
});
export async function POST(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return unauthorizedResponse();
  try {
    const { id } = await params;
    const team = await db.team.findUnique({
      where: { id },
      include: {
        members: true,
        _count: { select: { members: true } },
      },
    });
    if (!team) return notFoundResponse("Team");
    if (team.ownerId !== session.user.id) return forbiddenResponse();
    if (team._count.members >= 5) {
      return errorResponse("Team is full. Maximum 5 members allowed on the Team plan.", 402);
    }
    const body = await req.json();
    const { email } = inviteSchema.parse(body);
    const invitee = await db.user.findUnique({
      where: { emailNormalized: email.toLowerCase(), deletedAt: null },
      select: { id: true, name: true, email: true },
    });
    if (!invitee) {
      return errorResponse(
        "No account found with that email. They need to sign up first.",
        404
      );
    }
    const alreadyMember = team.members.some((m) => m.userId === invitee.id);
    if (alreadyMember) {
      return errorResponse("This user is already a member of your team.", 409);
    }
    const member = await db.teamMember.create({
      data: {
        teamId: id,
        userId: invitee.id,
        role: "TEAM_MEMBER",
        invitedBy: session.user.id,
      },
      include: {
        user: { select: { id: true, name: true, email: true, image: true } },
      },
    });
    await db.notification.create({
      data: {
        userId: invitee.id,
        type: "TEAM_INVITE",
        title: "You've been added to a team",
        message: `${session.user.name ?? "Someone"} added you to the team "${team.name}".`,
        metadata: { teamId: id, teamName: team.name },
      },
    });
    try {
      await resend.emails.send({
        from: EMAIL_CONFIG.from,
        to: invitee.email,
        subject: `You've been added to "${team.name}" on ResumeRank AI`,
        html: buildTeamInviteEmail(
          invitee.name ?? invitee.email,
          session.user.name ?? "A team admin",
          team.name,
          `${APP_URL}/dashboard`
        ),
      });
    } catch {
    }
    return successResponse(member, "Member invited successfully", undefined, 201);
  } catch (error) {
    if (error instanceof ZodError) return validationErrorResponse(error);
    return handleApiError(error);
  }
}
function buildTeamInviteEmail(
  recipientName: string,
  inviterName: string,
  teamName: string,
  dashboardUrl: string
): string {
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
      <h1 style="color: #1a1a1a; font-size: 22px; font-weight: 700; margin: 0 0 12px;">
        You've been added to a team!
      </h1>
      <p style="color: #6b7280; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
        Hi ${recipientName}, <strong>${inviterName}</strong> has added you to the team
        <strong>"${teamName}"</strong> on ResumeRank AI.
      </p>
      <a href="${dashboardUrl}"
         style="display: block; text-align: center; background: #6366f1; color: white; padding: 14px 28px; border-radius: 10px; text-decoration: none; font-size: 16px; font-weight: 600; margin-bottom: 24px;">
        Go to Dashboard →
      </a>
      <hr style="border: none; border-top: 1px solid #f3f4f6; margin: 32px 0;" />
      <p style="color: #d1d5db; font-size: 12px; text-align: center; margin: 0;">
        ResumeRank AI · <a href="${APP_URL}" style="color: #d1d5db;">${APP_URL}</a>
      </p>
    </div>
  `;
}
