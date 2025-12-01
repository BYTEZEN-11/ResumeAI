import { resumeRepository } from "@/modules/resume/repositories/resume.repository";
import { storageService } from "@/modules/resume/services/storage.service";
import { db } from "@/lib/db";
import type { CreateResumeInput, UpdateResumeInput } from "@/modules/resume/schemas/resume.schema";
import type { PaginationMeta } from "@/types";
import type { Resume } from "@prisma/client";
const MAX_FREE_RESUMES = 3;
export class ResumeService {
  async uploadAndCreate(
    file: File,
    data: CreateResumeInput,
    userId: string
  ) {

    const uploadResult = await storageService.uploadResume(file, userId);
    try {
      return await db.$transaction(
        async (tx) => {
          const subscription = await tx.subscription.findUnique({
            where: { userId },
          });
          if (subscription?.plan === "FREE") {
            const count = await tx.resume.count({
              where: { userId, deletedAt: null },
            });
            if (count >= MAX_FREE_RESUMES) {
              throw new Error(
                "Free plan allows a maximum of 3 resumes. Please upgrade to Pro."
              );
            }
          }
          return resumeRepository.create({
            userId,
            title: data.title,
            description: data.description,
            fileUrl: uploadResult.url,
            fileName: file.name,
            fileSize: file.size,
            fileType: uploadResult.fileType,
            storagePath: uploadResult.path,
            tags: data.tags,
          });
        },
        { isolationLevel: "Serializable" }
      );
    } catch (err) {

      await storageService.deleteFile(uploadResult.path).catch(() => {});
      throw err;
    }
  }
  async getResume(id: string, userId: string) {
    const resume = await resumeRepository.findByIdWithFiles(id, userId);
    if (!resume) throw new Error("Resume not found");
    return resume;
  }
  async listResumes(
    userId: string,
    params: {
      page?: number;
      pageSize?: number;
      search?: string;
      sortBy?: "createdAt" | "updatedAt" | "title";
      sortOrder?: "asc" | "desc";
    }
  ): Promise<{ resumes: Resume[]; meta: PaginationMeta }> {
    return resumeRepository.list({ userId, ...params });
  }
  async updateResume(id: string, userId: string, data: UpdateResumeInput) {
    await this.assertOwnership(id, userId);
    return resumeRepository.update(id, userId, data);
  }
  async replaceResumeFile(id: string, userId: string, file: File) {
    await this.assertOwnership(id, userId);

    const uploaded = await storageService.uploadResume(file, userId);

    const existing = await resumeRepository.findById(id, userId);

    const updated = await resumeRepository.replaceFile(id, userId, {
      fileUrl: uploaded.url,
      fileName: file.name,
      fileSize: file.size,
      fileType: uploaded.fileType,
      storagePath: uploaded.path,
    });

    if (existing?.storagePath) {
      storageService.deleteFile(existing.storagePath).catch(() => {});
    }
    return updated;
  }
  async deleteResume(id: string, userId: string) {
    const resume = await this.assertOwnership(id, userId);
    await resumeRepository.softDelete(id, userId);

    storageService.deleteFile(resume.storagePath).catch(() => {});
  }
  private async assertOwnership(id: string, userId: string): Promise<Resume> {
    const resume = await resumeRepository.findById(id, userId);
    if (!resume) throw new Error("Resume not found or access denied");
    return resume;
  }
}
export const resumeService = new ResumeService();
