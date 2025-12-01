import type { MetadataRoute } from "next";
import { APP_URL } from "@/constants";
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/dashboard/", "/admin/", "/settings/", "/billing/"],
      },
    ],
    sitemap: `${APP_URL}/sitemap.xml`,
  };
}
