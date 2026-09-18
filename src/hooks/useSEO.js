import { useEffect } from "react";

const DEFAULT_TITLE = "Kramasha — Photography, Event & Creative Business Management Software";
const DEFAULT_DESC = "Kramasha is an all-in-one business management platform for photographers, event managers, studios and creative businesses. Manage leads, clients, projects, teams, quotations, invoices, payments and finances — all in one place. Free plan available.";
const DEFAULT_KEYWORDS = "photography business management software, photography CRM, event management software, photography invoicing, photography quotation software, creative business management, studio management software, photographer CRM India, event planner software, client portal, team management, payment tracking, milestone billing, job sheet, GST invoicing, freelance business management, architecture project management, interior design business software";
const DEFAULT_IMAGE = "https://media.base44.com/images/public/6aa198140e2903037c880386/6965bcea4_generated_image.png";
const BASE_URL = "https://kramasha.com";

function setMeta(attr, selector, content) {
  if (!content) return;
  let el = document.head.querySelector(selector);
  if (!el) {
    el = document.createElement("meta");
    const [k, v] = Object.entries(attr)[0];
    el.setAttribute(k, v);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function setLink(rel, href) {
  if (!href) return;
  let el = document.head.querySelector(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", rel);
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

/**
 * useSEO — updates document head (title, meta description, keywords, OG, Twitter, canonical)
 * for per-page SEO. Restores defaults on cleanup.
 */
export function useSEO({ title, description, keywords, image, path, noIndex = false }) {
  useEffect(() => {
    const fullTitle = title || DEFAULT_TITLE;
    const desc = description || DEFAULT_DESC;
    const kw = keywords || DEFAULT_KEYWORDS;
    const img = image || DEFAULT_IMAGE;
    const url = path ? `${BASE_URL}${path}` : BASE_URL;

    document.title = fullTitle;

    setMeta({ name: "description" }, 'meta[name="description"]', desc);
    setMeta({ name: "keywords" }, 'meta[name="keywords"]', kw);
    setMeta({ name: "robots" }, 'meta[name="robots"]', noIndex ? "noindex, nofollow" : "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1");

    // Open Graph
    setMeta({ property: "og:title" }, 'meta[property="og:title"]', fullTitle);
    setMeta({ property: "og:description" }, 'meta[property="og:description"]', desc);
    setMeta({ property: "og:url" }, 'meta[property="og:url"]', url);
    setMeta({ property: "og:image" }, 'meta[property="og:image"]', img);

    // Twitter
    setMeta({ name: "twitter:title" }, 'meta[name="twitter:title"]', fullTitle);
    setMeta({ name: "twitter:description" }, 'meta[name="twitter:description"]', desc);
    setMeta({ name: "twitter:image" }, 'meta[name="twitter:image"]', img);

    // Canonical
    setLink("canonical", url);

    return () => {
      // Restore defaults on unmount
      document.title = DEFAULT_TITLE;
      setMeta({ name: "description" }, 'meta[name="description"]', DEFAULT_DESC);
      setMeta({ name: "keywords" }, 'meta[name="keywords"]', DEFAULT_KEYWORDS);
      setMeta({ name: "robots" }, 'meta[name="robots"]', "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1");
      setMeta({ property: "og:title" }, 'meta[property="og:title"]', DEFAULT_TITLE);
      setMeta({ property: "og:description" }, 'meta[property="og:description"]', DEFAULT_DESC);
      setMeta({ property: "og:url" }, 'meta[property="og:url"]', BASE_URL);
      setMeta({ property: "og:image" }, 'meta[property="og:image"]', DEFAULT_IMAGE);
      setMeta({ name: "twitter:title" }, 'meta[name="twitter:title"]', DEFAULT_TITLE);
      setMeta({ name: "twitter:description" }, 'meta[name="twitter:description"]', DEFAULT_DESC);
      setMeta({ name: "twitter:image" }, 'meta[name="twitter:image"]', DEFAULT_IMAGE);
      setLink("canonical", BASE_URL);
    };
  }, [title, description, keywords, image, path, noIndex]);
}

export default useSEO;