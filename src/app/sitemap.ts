import type { MetadataRoute } from "next";
import { APP_URL } from "@/constants";
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: APP_URL, lastModified: new Date(), changeFrequency: "weekly", priority: 1 },
    { url: `${APP_URL}/auth/signin`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
    { url: `${APP_URL}/auth/signup`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.9 },
    { url: `${APP_URL}/#pricing`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
    { url: `${APP_URL}/#features`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.6 },
  ];
}
