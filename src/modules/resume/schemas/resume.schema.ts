import { z } from "zod";
import { MAX_FILE_SIZE, ACCEPTED_MIME_TYPES } from "@/constants";
export const createResumeSchema = z.object({
  title: z.string().min(1, "Title is required").max(200, "Title is too long"),
  description: z.string().max(500, "Description is too long").optional(),
  tags: z.array(z.string()).max(10, "Maximum 10 tags").optional().default([]),
});
export const updateResumeSchema = createResumeSchema.partial();
export const resumeFileSchema = z.object({
  name: z.string(),
  size: z.number().max(MAX_FILE_SIZE, `File size must be less than 5MB`),
  type: z.enum(ACCEPTED_MIME_TYPES as [string, ...string[]]),
});
export const resumeQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(100).default(10),
  search: z.string().optional(),
  sortBy: z.enum(["createdAt", "updatedAt", "title"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});
export type CreateResumeInput = z.infer<typeof createResumeSchema>;
export type UpdateResumeInput = z.infer<typeof updateResumeSchema>;
export type ResumeFileInput = z.infer<typeof resumeFileSchema>;
export type ResumeQueryInput = z.infer<typeof resumeQuerySchema>;
