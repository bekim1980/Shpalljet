import { useEffect } from "react";
import { getValidSeoImageUrl, SITE_URL, DEFAULT_OG_IMAGE as DEFAULT_IMAGE } from "@/lib/seoImage";

interface SEOProps {
  title: string;
  description?: string;
  canonical?: string;
  image?: string;
  type?: "website" | "article" | "product";
  noindex?: boolean;
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
}


const upsertMeta = (selector: string, attr: "name" | "property", key: string, content: string) => {
  let el = document.head.querySelector<HTMLMetaElement>(selector);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
};

const upsertLink = (rel: string, href: string) => {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", rel);
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
};

/**
 * Lightweight, dependency-free SEO/meta manager.
 * Updates <title>, description, canonical, OG/Twitter tags and optional JSON-LD.
 */
const SEO = ({ title, description, canonical, image, type = "website", noindex, jsonLd }: SEOProps) => {
  useEffect(() => {
    const fullTitle = title.length > 60 ? title.slice(0, 57) + "…" : title;
    document.title = fullTitle;

    if (description) {
      const desc = description.length > 160 ? description.slice(0, 157) + "…" : description;
      upsertMeta('meta[name="description"]', "name", "description", desc);
      upsertMeta('meta[property="og:description"]', "property", "og:description", desc);
      upsertMeta('meta[name="twitter:description"]', "name", "twitter:description", desc);
    }

    upsertMeta('meta[property="og:title"]', "property", "og:title", fullTitle);
    upsertMeta('meta[name="twitter:title"]', "name", "twitter:title", fullTitle);
    upsertMeta('meta[property="og:type"]', "property", "og:type", type);

    const url = canonical || (typeof window !== "undefined" ? window.location.href : SITE_URL);
    upsertLink("canonical", url);
    upsertMeta('meta[property="og:url"]', "property", "og:url", url);
    upsertMeta('meta[name="twitter:url"]', "name", "twitter:url", url);

    const img = getValidSeoImageUrl(image ? [image] : []);
    upsertMeta('meta[property="og:image"]', "property", "og:image", img);
    upsertMeta('meta[name="twitter:image"]', "name", "twitter:image", img);
    upsertMeta('meta[name="twitter:card"]', "name", "twitter:card", "summary_large_image");

    upsertMeta('meta[name="robots"]', "name", "robots", noindex ? "noindex,nofollow" : "index,follow");

    // JSON-LD
    document.head.querySelectorAll('script[data-seo-jsonld="true"]').forEach((n) => n.remove());
    if (jsonLd) {
      const arr = Array.isArray(jsonLd) ? jsonLd : [jsonLd];
      arr.forEach((data) => {
        const s = document.createElement("script");
        s.type = "application/ld+json";
        s.dataset.seoJsonld = "true";
        s.text = JSON.stringify(data);
        document.head.appendChild(s);
      });
    }

    return () => {
      document.head.querySelectorAll('script[data-seo-jsonld="true"]').forEach((n) => n.remove());
    };
  }, [title, description, canonical, image, type, noindex, jsonLd]);

  return null;
};

export default SEO;
export { SITE_URL, DEFAULT_IMAGE };
