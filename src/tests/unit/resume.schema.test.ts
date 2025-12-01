import { describe, it, expect } from "vitest";
import { createResumeSchema, resumeQuerySchema } from "@/modules/resume/schemas/resume.schema";
describe("createResumeSchema", () => {
  it("accepts valid input", () => {
    const result = createResumeSchema.safeParse({ title: "My Resume" });
    expect(result.success).toBe(true);
  });
  it("rejects empty title", () => {
    const result = createResumeSchema.safeParse({ title: "" });
    expect(result.success).toBe(false);
  });
  it("rejects title over 200 chars", () => {
    const result = createResumeSchema.safeParse({ title: "a".repeat(201) });
    expect(result.success).toBe(false);
  });
  it("accepts with description and tags", () => {
    const result = createResumeSchema.safeParse({
      title: "Software Engineer Resume",
      description: "My best resume",
      tags: ["react", "typescript"],
    });
    expect(result.success).toBe(true);
  });
  it("rejects more than 10 tags", () => {
    const result = createResumeSchema.safeParse({
      title: "My Resume",
      tags: Array.from({ length: 11 }, (_, i) => `tag${i}`),
    });
    expect(result.success).toBe(false);
  });
});
describe("resumeQuerySchema", () => {
  it("applies defaults", () => {
    const result = resumeQuerySchema.parse({});
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(10);
    expect(result.sortBy).toBe("createdAt");
    expect(result.sortOrder).toBe("desc");
  });
  it("coerces string numbers", () => {
    const result = resumeQuerySchema.parse({ page: "2", pageSize: "20" });
    expect(result.page).toBe(2);
    expect(result.pageSize).toBe(20);
  });
  it("rejects pageSize over 100", () => {
    const result = resumeQuerySchema.safeParse({ pageSize: "200" });
    expect(result.success).toBe(false);
  });
});
