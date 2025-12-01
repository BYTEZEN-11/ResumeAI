import pdfParse from "pdf-parse";
import mammoth from "mammoth";
import { assertSafeUrl, safeFetch, SSRFBlockedError } from "@/lib/ssrf-guard";
import { logger } from "@/lib/logger";
import { supabaseAdmin, STORAGE_BUCKET } from "@/lib/supabase";
export class TextExtractorService {
  async extractFromBuffer(buffer: Buffer, mimeType: string): Promise<string> {
    if (mimeType === "application/pdf") {
      return this.extractFromPdf(buffer);
    }
    if (
      mimeType ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
      return this.extractFromDocx(buffer);
    }
    throw new Error(`Unsupported file type: ${mimeType}`);
  }
  async extractFromStoragePath(
    storagePath: string,
    fileType: "PDF" | "DOCX"
  ): Promise<string> {
    const MAX_BYTES = 5 * 1024 * 1024;
    const { data, error } = await supabaseAdmin.storage
      .from(STORAGE_BUCKET)
      .download(storagePath);
    if (error || !data) {
      throw new Error("Failed to download resume from storage.");
    }

    const arrayBuffer = await data.arrayBuffer();
    if (arrayBuffer.byteLength > MAX_BYTES) {
      throw new Error("Resume file is too large.");
    }
    const buffer = Buffer.from(arrayBuffer);
    const mimeType =
      fileType === "PDF"
        ? "application/pdf"
        : "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    return this.extractFromBuffer(buffer, mimeType);
  }
  async extractFromUrl(url: string, fileType: "PDF" | "DOCX"): Promise<string> {

    try {
      await assertSafeUrl(url);
    } catch (err) {
      if (err instanceof SSRFBlockedError) {
        logger.error({ url }, "Refusing to fetch resume from unsafe URL");
        throw new Error("Resume file URL is not accessible.");
      }
      throw err;
    }

    const MAX_BYTES = 5 * 1024 * 1024;

    const response = await safeFetch(url, {
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch file: ${response.statusText}`);
    }
    const contentLengthHeader = response.headers.get("content-length");
    if (contentLengthHeader) {
      const declared = Number.parseInt(contentLengthHeader, 10);
      if (Number.isFinite(declared) && declared > MAX_BYTES) {
        throw new Error("Resume file is too large.");
      }
    }
    const arrayBuffer = await response.arrayBuffer();
    if (arrayBuffer.byteLength > MAX_BYTES) {
      throw new Error("Resume file is too large.");
    }
    const buffer = Buffer.from(arrayBuffer);
    const mimeType =
      fileType === "PDF"
        ? "application/pdf"
        : "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    return this.extractFromBuffer(buffer, mimeType);
  }
  async getOrExtract(
    resumeId: string,
    storagePath: string,
    fileType: "PDF" | "DOCX"
  ): Promise<string> {
    const { db } = await import("@/lib/db");
    const resume = await db.resume.findUnique({
      where: { id: resumeId },
      select: { extractedText: true, extractedAt: true },
    });
    if (resume?.extractedText && resume.extractedAt) {
      return resume.extractedText;
    }
    const text = await this.extractFromStoragePath(storagePath, fileType);

    await db.resume
      .update({
        where: { id: resumeId },
        data: { extractedText: text, extractedAt: new Date() },
      })
      .catch((err) => {
        logger.error({ resumeId, err }, "Failed to cache extracted text");
      });
    return text;
  }
  private async extractFromPdf(buffer: Buffer): Promise<string> {
    const data = await pdfParse(buffer);
    return this.cleanText(data.text);
  }
  private async extractFromDocx(buffer: Buffer): Promise<string> {
    const result = await mammoth.extractRawText({ buffer });
    return this.cleanText(result.value);
  }
  cleanText(text: string): string {
    return text
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .replace(/[ \t]+/g, " ")
      .replace(/^\s+|\s+$/gm, "")
      .trim();
  }
}
export const textExtractorService = new TextExtractorService();
