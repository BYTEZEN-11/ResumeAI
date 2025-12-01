import { db } from "@/lib/db";
import type { Resume, FileType } from "@prisma/client";
import type { PaginationMeta } from "@/types";
export type CreateResumeData = {
  userId: string;
  title: string;
  description?: string;
  fileUrl: string;
  fileName: string;
  fileSize: number;
  fileType: FileType;
  storagePath: string;
  tags?: string[];
};
export type UpdateResumeData = {
  title?: string;
  description?: string;
  tags?: string[];
};
export type ResumeListParams = {
  userId: string;
  page?: number;
  pageSize?: number;
  search?: string;
  sortBy?: "createdAt" | "updatedAt" | "title";
  sortOrder?: "asc" | "desc";
};
export class ResumeRepository {
  async create(data: CreateResumeData): Promise<Resume> {
    const resume = await db.$transaction(async (tx) => {
      const newResume = await tx.resume.create({
        data: {
          userId: data.userId,
          title: data.title,
          description: data.description,
          fileUrl: data.fileUrl,
          fileName: data.fileName,
          fileSize: data.fileSize,
          fileType: data.fileType,
          storagePath: data.storagePath,
          tags: data.tags ?? [],
          version: 1,
          isActive: true,
        },
      });

      await tx.resumeFile.create({
        data: {
          resumeId: newResume.id,
          fileUrl: data.fileUrl,
          fileName: data.fileName,
          fileSize: data.fileSize,
          fileType: data.fileType,
          storagePath: data.storagePath,
          version: 1,
          isActive: true,
        },
      });
      return newResume;
    });
    return resume;
  }
  async findById(id: string, userId: string): Promise<Resume | null> {
    return db.resume.findFirst({
      where: { id, userId, deletedAt: null },
    });
  }
  async findByIdWithFiles(id: string, userId: string) {
    return db.resume.findFirst({
      where: { id, userId, deletedAt: null },
      include: {
        files: { orderBy: { version: "desc" } },
        analyses: {
          where: { deletedAt: null },
          orderBy: { createdAt: "desc" },
          take: 5,
          include: { jobDescription: true },
        },
      },
    });
  }
  async list(params: ResumeListParams): Promise<{ resumes: Resume[]; meta: PaginationMeta }> {
    const { userId, page = 1, pageSize = 10, search, sortBy = "createdAt", sortOrder = "desc" } = params;
    const where = {
      userId,
      deletedAt: null,
      ...(search && {
        OR: [
          { title: { contains: search, mode: "insensitive" as const } },
          { description: { contains: search, mode: "insensitive" as const } },
        ],
      }),
    };
    const [total, resumes] = await Promise.all([
      db.resume.count({ where }),
      db.resume.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);
    return {
      resumes,
      meta: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
        hasNextPage: page * pageSize < total,
        hasPrevPage: page > 1,
      },
    };
  }
  async update(id: string, userId: string, data: UpdateResumeData): Promise<Resume> {
    return db.resume.update({
      where: { id, userId },
      data: { ...data, updatedAt: new Date() },
    });
  }
  async replaceFile(
    id: string,
    userId: string,
    fileData: Omit<CreateResumeData, "userId" | "title">
  ): Promise<Resume> {
    return db.$transaction(async (tx) => {
      const current = await tx.resume.findFirst({
        where: { id, userId, deletedAt: null },
      });
      if (!current) throw new Error("Resume not found");
      const newVersion = current.version + 1;

      await tx.resumeFile.updateMany({
        where: { resumeId: id, isActive: true },
        data: { isActive: false },
      });

      await tx.resumeFile.create({
        data: {
          resumeId: id,
          fileUrl: fileData.fileUrl,
          fileName: fileData.fileName,
          fileSize: fileData.fileSize,
          fileType: fileData.fileType,
          storagePath: fileData.storagePath,
          version: newVersion,
          isActive: true,
        },
      });

      return tx.resume.update({
        where: { id },
        data: {
          fileUrl: fileData.fileUrl,
          fileName: fileData.fileName,
          fileSize: fileData.fileSize,
          fileType: fileData.fileType,
          storagePath: fileData.storagePath,
          version: newVersion,
        },
      });
    });
  }
  async softDelete(id: string, userId: string): Promise<void> {
    await db.resume.update({
      where: { id, userId },
      data: { deletedAt: new Date(), isActive: false },
    });
  }
  async countByUser(userId: string): Promise<number> {
    return db.resume.count({
      where: { userId, deletedAt: null },
    });
  }
}
export const resumeRepository = new ResumeRepository();
