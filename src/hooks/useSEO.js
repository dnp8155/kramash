import { useEffect } from "react";

const DEFAULT_TITLE = "Kramasha — Photography, Event & Creative Business Management Software India | Free CRM, Invoicing, Quotations";
const DEFAULT_DESC = "Kramasha is the all-in-one business management platform for photographers, event managers, studios and creative businesses in India. Manage leads, clients, projects, teams, quotations, invoices, payments and finances — all in one place. Free plan available. GST invoicing, digital quotation signing, client portal, team scheduling, milestone billing. Built for Gujarat and India.";
const DEFAULT_KEYWORDS = "photography business management software India, photography CRM Gujarat, event management software India, studio management software, photographer invoicing, photography quotation software, wedding photography business management, event planner software Gujarat, creative business management platform India, photography client portal, team management software photographers, payment tracking software, milestone billing software, GST invoicing software India, freelance business management, architecture project management, interior design business software, business management app for photographers, best photography CRM India, free business management software India, quotation builder software, invoice generator India, digital signature quotation, client project portal, team scheduling software, availability calendar software, financial year management, expense tracking software, lead management CRM, Kramasha, Kramasha app, Kramasha platform";
const DEFAULT_IMAGE = "https://media.base44.com/images/public/6aa198140e2903037c880386/6965bcea4_generated_image.png";
const BASE_URL = "https://www.kramasha.com";

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

function setJsonLd(id, data) {
  if (!data) return;
  let el = document.getElementById(id);
  if (el) {
    el.textContent = JSON.stringify(data);
  } else {
    el = document.createElement("script");
    el.type = "application/ld+json";
    el.id = id;
    el.textContent = JSON.stringify(data);
    document.head.appendChild(el);
  }
}

function removeJsonLd(id) {
  const el = document.getElementById(id);
  if (el) el.remove();
}

/**
 * useSEO — comprehensive on-page SEO: title, meta description, keywords, OG,
 * Twitter, canonical URL, robots, and JSON-LD structured data.
 * Restores defaults on cleanup.
 */
export function useSEO({
  title,
  description,
  keywords,
  image,
  path,
  noIndex = false,
  jsonLd,
  breadcrumbs,
  ogType = "website",
}) {
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
    setMeta({ property: "og:type" }, 'meta[property="og:type"]', ogType);
    setMeta({ property: "og:title" }, 'meta[property="og:title"]', fullTitle);
    setMeta({ property: "og:description" }, 'meta[property="og:description"]', desc);
    setMeta({ property: "og:url" }, 'meta[property="og:url"]', url);
    setMeta({ property: "og:image" }, 'meta[property="og:image"]', img);

    // Twitter
    setMeta({ name: "twitter:card" }, 'meta[name="twitter:card"]', "summary_large_image");
    setMeta({ name: "twitter:title" }, 'meta[name="twitter:title"]', fullTitle);
    setMeta({ name: "twitter:description" }, 'meta[name="twitter:description"]', desc);
    setMeta({ name: "twitter:image" }, 'meta[name="twitter:image"]', img);
    setMeta({ name: "twitter:image:alt" }, 'meta[name="twitter:image:alt"]', fullTitle);

    // Canonical
    setLink("canonical", url);

    // JSON-LD structured data
    if (jsonLd) {
      setJsonLd("page-jsonld", jsonLd);
    }

    // Breadcrumb structured data
    if (breadcrumbs && breadcrumbs.length > 0) {
      setJsonLd("breadcrumb-jsonld", {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: breadcrumbs.map((b, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: b.name,
          item: b.url ? `${BASE_URL}${b.url}` : undefined,
        })),
      });
    }

    return () => {
      // Restore defaults on unmount
      document.title = DEFAULT_TITLE;
      setMeta({ name: "description" }, 'meta[name="description"]', DEFAULT_DESC);
      setMeta({ name: "keywords" }, 'meta[name="keywords"]', DEFAULT_KEYWORDS);
      setMeta({ name: "robots" }, 'meta[name="robots"]', "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1");
      setMeta({ property: "og:type" }, 'meta[property="og:type"]', "website");
      setMeta({ property: "og:title" }, 'meta[property="og:title"]', DEFAULT_TITLE);
      setMeta({ property: "og:description" }, 'meta[property="og:description"]', DEFAULT_DESC);
      setMeta({ property: "og:url" }, 'meta[property="og:url"]', BASE_URL);
      setMeta({ property: "og:image" }, 'meta[property="og:image"]', DEFAULT_IMAGE);
      setMeta({ name: "twitter:title" }, 'meta[name="twitter:title"]', DEFAULT_TITLE);
      setMeta({ name: "twitter:description" }, 'meta[name="twitter:description"]', DEFAULT_DESC);
      setMeta({ name: "twitter:image" }, 'meta[name="twitter:image"]', DEFAULT_IMAGE);
      setLink("canonical", BASE_URL);
      removeJsonLd("page-jsonld");
      removeJsonLd("breadcrumb-jsonld");
    };
  }, [title, description, keywords, image, path, noIndex, jsonLd, breadcrumbs, ogType]);
}

export default useSEO;