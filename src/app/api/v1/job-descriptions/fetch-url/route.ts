import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { z } from "zod";
import {
  successResponse,
  handleApiError,
  unauthorizedResponse,
  validationErrorResponse,
  errorResponse,
} from "@/shared/utils/api-response";
import { rateLimit } from "@/shared/utils/rate-limit";
import { assertSafeUrl, safeFetch, SSRFBlockedError } from "@/lib/ssrf-guard";
import { ZodError } from "zod";
const schema = z.object({
  url: z.string().url("Please enter a valid URL"),
});
type FetchedJob = {
  title: string;
  company: string;
  description: string;
  url: string;
};

function stripHtml(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, "")
    .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, "")
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function getMeta(html: string, name: string): string {
  const patterns = [
    new RegExp(`<meta[^>]+property=["']og:${name}["'][^>]+content=["']([^"']+)["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:${name}["']`, "i"),
    new RegExp(`<meta[^>]+name=["']${name}["'][^>]+content=["']([^"']+)["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${name}["']`, "i"),
  ];
  for (const p of patterns) {
    const m = html.match(p);
    if (m?.[1]) return m[1].trim();
  }
  return "";
}

function getTitle(html: string): string {
  const m = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return m?.[1]?.trim() ?? "";
}

function extractJobContent(html: string, rawText: string): string {

  const containers = [
    /<article[^>]*>([\s\S]*?)<\/article>/i,
    /<div[^>]*(?:job-description|jobDescription|job_description|description|job-details|jobDetails)[^>]*>([\s\S]*?)<\/div>/i,
    /<section[^>]*(?:job|description|details)[^>]*>([\s\S]*?)<\/section>/i,
    /<div[^>]*class=["'][^"']*(?:description|job-body|posting)[^"']*["'][^>]*>([\s\S]*?)<\/div>/i,
  ];
  for (const pattern of containers) {
    const match = html.match(pattern);
    if (match?.[1]) {
      const text = stripHtml(match[1]);
      if (text.length > 200) return text.substring(0, 8000);
    }
  }

  return rawText.substring(0, 8000);
}

function parsePageTitle(pageTitle: string, ogTitle: string): { title: string; company: string } {
  const raw = ogTitle || pageTitle;

  const clean = raw
    .replace(/\s*[|\-–—]\s*(LinkedIn|Indeed|Glassdoor|Naukri|Monster|ZipRecruiter|Lever|Greenhouse|Workday|Ashby|Wellfound|AngelList|Jobs)[^\-|–—]*/gi, "")
    .trim();

  const atMatch = clean.match(/^(.+?)\s+(?:at|@)\s+(.+)$/i);
  if (atMatch) return { title: atMatch[1].trim(), company: atMatch[2].trim() };
  const dashMatch = clean.match(/^(.+?)\s*[-–—]\s*(.+)$/);
  if (dashMatch) return { title: dashMatch[1].trim(), company: dashMatch[2].trim() };
  return { title: clean, company: "" };
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return unauthorizedResponse();

  const limit = await rateLimit(req, { limit: 20, windowMs: 60_000 });
  if (!limit.success) {
    return errorResponse("Too many requests. Please wait a moment.", 429);
  }
  try {
    const body = await req.json();
    const { url } = schema.parse(body);

    try {
      await assertSafeUrl(url);
    } catch (err) {
      if (err instanceof SSRFBlockedError) {
        return errorResponse("URL is not allowed.", 400);
      }
      throw err;
    }

    const MAX_BYTES = 5 * 1024 * 1024;

    const response = await safeFetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; ResumeRankBot/1.0; +https://resumerank.ai/bot)",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        "Cache-Control": "no-cache",
      },
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) {
      return errorResponse(
        `Could not fetch the URL (HTTP ${response.status}). Make sure the URL is publicly accessible.`,
        400
      );
    }

    const contentLengthHeader = response.headers.get("content-length");
    if (contentLengthHeader) {
      const declared = Number.parseInt(contentLengthHeader, 10);
      if (Number.isFinite(declared) && declared > MAX_BYTES) {
        return errorResponse("URL is too large to fetch.", 413);
      }
    }
    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html")) {
      return errorResponse("URL does not point to an HTML page. Please paste the job description manually.", 400);
    }
    const html = await response.text();
    if (html.length > MAX_BYTES) {
      return errorResponse("URL is too large to fetch.", 413);
    }
    const ogTitle = getMeta(html, "title");
    const ogDescription = getMeta(html, "description");
    const pageTitle = getTitle(html);
    const rawText = stripHtml(html);
    const { title, company } = parsePageTitle(pageTitle, ogTitle);
    const description = extractJobContent(html, rawText);
    if (!description || description.length < 100) {
      return errorResponse(
        "Could not extract enough content from this URL. Please paste the job description manually.",
        422
      );
    }
    const result: FetchedJob = {
      title: title || "Job Opening",
      company: company || getMeta(html, "site_name") || "",
      description: ogDescription && ogDescription.length > 200
        ? ogDescription
        : description,
      url,
    };
    return successResponse(result, "Job description fetched successfully");
  } catch (error) {
    if (error instanceof ZodError) return validationErrorResponse(error);

    if (error instanceof Error) {
      if (error.name === "TimeoutError" || error.message.includes("timeout")) {
        return errorResponse("Request timed out. The URL took too long to respond.", 408);
      }
      if (error.message.includes("fetch")) {
        return errorResponse("Could not reach the URL. Check that it is publicly accessible.", 400);
      }
    }
    return handleApiError(error);
  }
}
