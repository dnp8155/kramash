import { describe, it, expect } from "vitest";
import fs from "fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ReactMarkdown from "react-markdown";
import * as legal from "@/lib/legalContent";
import { faqContent, faqSlug } from "@/constants/faqContent";

// Every in-app link written inside the FAQ and the legal pages must open a real page.
const app = fs.readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");
const routes = [...app.matchAll(/<Route[^>]*\bpath="([^"]+)"/g)].map((m) => m[1]);
const routeRegexes = routes.map((r) => new RegExp("^" + r.replace(/:[^/]+/g, "[^/]+").replace(/\*/g, ".*") + "/?$"));
const opens = (path) => routeRegexes.some((re) => re.test(path));

const docs = {
  terms: legal.termsOfServiceContent,
  privacy: legal.privacyPolicyContent,
  refund: legal.refundPolicyContent,
  contact: legal.contactContent,
  about: legal.aboutContent,
  ...Object.fromEntries(faqContent.map((f) => ["faq: " + f.q, f.a])),
};

describe("links in the FAQ and legal pages", () => {
  for (const [name, text] of Object.entries(docs)) {
    it(`${name} only links to pages that exist`, () => {
      const targets = [...String(text).matchAll(/\]\((\/[^)\s]*)\)/g)].map((m) => m[1]);
      for (const t of targets) {
        const path = t.split(/[?#]/)[0] || "/";
        expect(opens(path), `${name} links to ${t}`).toBe(true);
      }
    });
  }
  it("FAQ #anchors point to real questions", () => {
    const slugs = new Set(faqContent.map((f) => f.slug));
    for (const f of faqContent) {
      for (const m of f.a.matchAll(/\]\(#([^)]+)\)/g)) expect(slugs.has(m[1]), `${f.q} -> #${m[1]}`).toBe(true);
    }
    expect(faqSlug("What should my import file look like?")).toBe("what-should-my-import-file-look-like");
  });
});

describe("legal pages render cleanly", () => {
  for (const key of ["termsOfServiceContent", "privacyPolicyContent", "refundPolicyContent", "contactContent"]) {
    it(`${key} turns into proper HTML`, () => {
      const html = renderToStaticMarkup(createElement(ReactMarkdown, { children: legal[key] }));
      expect(html.length).toBeGreaterThan(500);
      expect(html).not.toMatch(/\*\*|^\* |\n\* |<p>\* /);
      expect(html).toContain("<h");
    });
  }
  it("every page carries the registered address and the same contact email", () => {
    for (const key of ["termsOfServiceContent", "privacyPolicyContent", "refundPolicyContent", "contactContent"]) {
      expect(legal[key], key).toContain("1-2, Basement, Lad Apartment, V K Marg, Vadodara, Gujarat 390001");
    }
    for (const key of ["termsOfServiceContent", "privacyPolicyContent", "refundPolicyContent", "contactContent"]) expect(legal[key], key).toContain("kramashaofficial@gmail.com");
  });
  it("the phone number is not written in any page text", () => {
    for (const text of Object.values(legal)) if (typeof text === "string") expect(text).not.toMatch(/8849885091|88498\s?85091/);
  });
});
