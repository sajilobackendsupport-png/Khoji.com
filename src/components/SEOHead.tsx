import React, { useEffect } from "react";

export interface SEOHeadProps {
  /** Page Title */
  title?: string;
  /** Meta Description */
  description?: string;
  /** Canonical or current URL */
  url?: string;
  /** Open Graph Image URL */
  image?: string;
  /** Site Name */
  siteName?: string;
  /** Twitter handle / Creator */
  twitterHandle?: string;
  /** Theme Color hex */
  themeColor?: string;
}

/**
 * Production-ready dynamic SEO & Social Metadata manager.
 * Safely updates document <head> meta tags including:
 * - Dynamic page title
 * - Standard meta description & robots
 * - Open Graph tags (og:title, og:description, og:image, og:url, og:site_name, og:type)
 * - Twitter Card tags (twitter:card, twitter:title, twitter:description, twitter:image, twitter:creator)
 */
export const SEOHead: React.FC<SEOHeadProps> = ({
  title = "Khoji.com - Emergency & Device Tracking Nepal",
  description = "Nepal's real-time emergency dispatch and lost device tracking system. Live GPS coordinates, one-tap hotline dialing, and police coordination.",
  url = typeof window !== "undefined" ? window.location.href : "https://khoji.com",
  image = "https://images.unsplash.com/photo-1544735716-392fe2489ffa?w=1200&auto=format&fit=crop&q=80",
  siteName = "Khoji Nepal",
  twitterHandle = "@KhojiNepal",
  themeColor = "#dc2626",
}) => {
  useEffect(() => {
    // 1. Update Document Title
    document.title = title;

    // Helper to set or create a <meta> tag
    const setMetaTag = (attr: "name" | "property", key: string, content: string) => {
      let element = document.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement | null;
      if (!element) {
        element = document.createElement("meta");
        element.setAttribute(attr, key);
        document.head.appendChild(element);
      }
      element.setAttribute("content", content);
    };

    // Standard SEO Tags
    setMetaTag("name", "description", description);
    setMetaTag("name", "theme-color", themeColor);
    setMetaTag("name", "robots", "index, follow");

    // Open Graph / Facebook Meta Tags
    setMetaTag("property", "og:type", "website");
    setMetaTag("property", "og:site_name", siteName);
    setMetaTag("property", "og:title", title);
    setMetaTag("property", "og:description", description);
    setMetaTag("property", "og:url", url);
    setMetaTag("property", "og:image", image);

    // Twitter Card Meta Tags
    setMetaTag("name", "twitter:card", "summary_large_image");
    setMetaTag("name", "twitter:title", title);
    setMetaTag("name", "twitter:description", description);
    setMetaTag("name", "twitter:image", image);
    if (twitterHandle) {
      setMetaTag("name", "twitter:creator", twitterHandle);
    }
  }, [title, description, url, image, siteName, twitterHandle, themeColor]);

  return null;
};

export default SEOHead;
