import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import {
  successResponse,
  handleApiError,
  unauthorizedResponse,
  validationErrorResponse,
} from "@/shared/utils/api-response";
import { ZodError } from "zod";
const updateProfileSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  bio: z.string().max(500).optional(),
  jobTitle: z.string().max(200).optional(),
  company: z.string().max(200).optional(),
  location: z.string().max(200).optional(),
  website: z.string().url().optional().or(z.literal("")),
  linkedinUrl: z.string().url().optional().or(z.literal("")),
  githubUrl: z.string().url().optional().or(z.literal("")),
  timezone: z.string().optional(),
});
export async function GET(_req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return unauthorizedResponse();
  try {
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      include: {
        profile: true,
        subscription: true,
        _count: { select: { resumes: true, analyses: true } },
      },
    });
    if (!user) return unauthorizedResponse();

    const { passwordHash: _ph, ...safeUser } = user;
    void _ph;
    return successResponse(safeUser, "Profile retrieved");
  } catch (error) {
    return handleApiError(error);
  }
}
export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return unauthorizedResponse();
  try {
    const body = await req.json();
    const validated = updateProfileSchema.parse(body);
    const { name, ...profileData } = validated;
    await db.$transaction([
      ...(name
        ? [db.user.update({ where: { id: session.user.id }, data: { name } })]
        : []),
      db.profile.upsert({
        where: { userId: session.user.id },
        update: {
          ...profileData,
          website: profileData.website || null,
          linkedinUrl: profileData.linkedinUrl || null,
          githubUrl: profileData.githubUrl || null,
        },
        create: {
          userId: session.user.id,
          ...profileData,
          website: profileData.website || null,
          linkedinUrl: profileData.linkedinUrl || null,
          githubUrl: profileData.githubUrl || null,
        },
      }),
    ]);
    return successResponse(null, "Profile updated");
  } catch (error) {
    if (error instanceof ZodError) return validationErrorResponse(error);
    return handleApiError(error);
  }
}
