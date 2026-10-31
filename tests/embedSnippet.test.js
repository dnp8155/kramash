import { describe, it, expect } from "vitest";
import fs from "fs";
import { inquiryEmbedUrl, inquiryEmbedSnippet, EMBED_HEIGHT_MESSAGE, embedStyleQuery, embedStyleVars, hexToHsl } from "@/lib/embedSnippet";
import { hostKey, isEmbedAllowed } from "../supabase/functions/_shared/embedOrigin.ts";

describe("inquiry embed code", () => {
  it("is two short lines: a placeholder with the slug and the loader script", () => {
    const code = inquiryEmbedSnippet("https://app.example.com", "shah-photo");
    expect(code.split("\n")).toHaveLength(2);
    expect(code).toContain('data-kramasha-inquiry="shah-photo"');
    expect(code).toContain('src="https://app.example.com/embed.js"');
    expect(code.length).toBeLessThan(140);
    expect(inquiryEmbedUrl("https://app.example.com", "shah-photo")).toBe("https://app.example.com/embed/inquiry/shah-photo");
  });

  it("uses the same height message on the loader and the embed page", () => {
    expect(fs.readFileSync("public/embed.js", "utf8")).toContain(EMBED_HEIGHT_MESSAGE);
  });
});

describe("who may show the embedded form", () => {
  it("reduces a website to its host, ignoring scheme, www, path and case", () => {
    expect(hostKey("https://www.Shah-Photo.com/contact?x=1")).toBe("shah-photo.com");
    expect(hostKey("shah-photo.com")).toBe("shah-photo.com");
    expect(hostKey("javascript:alert(1)")).toBe("");
    expect(hostKey("null")).toBe("null"); // a bare word is read as a host; it never equals a real website
    expect(hostKey("")).toBe("");
  });

  it("allows the business's own website, with or without www or https", () => {
    const site = "https://www.shah-photo.com";
    expect(isEmbedAllowed(site, true, ["https://shah-photo.com"])).toBe(true);
    expect(isEmbedAllowed(site, true, ["http://www.shah-photo.com"])).toBe(true);
    expect(isEmbedAllowed("shah-photo.com", true, ["https://www.shah-photo.com"])).toBe(true);
  });

  it("allows sub-pages' subdomains and several addresses", () => {
    const site = "https://shah-photo.com";
    expect(isEmbedAllowed(site, true, ["https://blog.shah-photo.com"])).toBe(true);
    expect(isEmbedAllowed("shah-photo.com, shahphoto.in", true, ["https://www.shahphoto.in"])).toBe(true);
    expect(isEmbedAllowed(site, true, ["https://shahphoto.in"], "shahphoto.in")).toBe(true);
    expect(isEmbedAllowed(site, true, ["https://shahphoto.in"], "")).toBe(false);
  });

  it("blocks every other website, look-alikes included", () => {
    const site = "https://shah-photo.com";
    expect(isEmbedAllowed(site, true, ["https://evil.com"])).toBe(false);
    expect(isEmbedAllowed(site, true, ["https://shah-photo.com.evil.com"])).toBe(false);
    expect(isEmbedAllowed(site, true, ["https://evilshah-photo.com"])).toBe(false);
    expect(isEmbedAllowed(site, true, ["null"])).toBe(false);
  });

  it("looks at the top page: frames in between (website builders) are fine, a foreign top page is not", () => {
    const site = "https://shah-photo.com";
    expect(isEmbedAllowed(site, true, ["https://filesusr.com", "https://shah-photo.com"])).toBe(true);
    expect(isEmbedAllowed(site, true, ["https://shah-photo.com", "https://evil.com"])).toBe(false);
  });

  it("lets the app itself show its own form (the preview)", () => {
    expect(isEmbedAllowed("shah-photo.com", true, ["https://app.example.com"], "", "https://app.example.com")).toBe(true);
    expect(isEmbedAllowed("shah-photo.com", true, ["https://evil.com"], "", "https://app.example.com")).toBe(false);
  });

  it("blocks when the parent is unknown or the business has no website", () => {
    expect(isEmbedAllowed("https://shah-photo.com", true, [])).toBe(false);
    expect(isEmbedAllowed("https://shah-photo.com", true, undefined)).toBe(false);
    expect(isEmbedAllowed("", true, ["https://shah-photo.com"])).toBe(false);
  });

  it("lets the form be opened on its own (a preview), which is not embedding", () => {
    expect(isEmbedAllowed("", false, [])).toBe(true);
  });
});

describe("matching the website's look", () => {
  const style = { transparent: true, text: "#222222", accent: "B8860B", fields: "not-a-colour" };

  it("puts valid choices in the code and the address, and ignores bad ones", () => {
    expect(embedStyleQuery(style)).toBe("?bg=transparent&text=%23222222&accent=%23b8860b");
    expect(inquiryEmbedSnippet("https://a.com", "x", style)).toContain('data-bg="transparent" data-text="#222222" data-accent="#b8860b"></div>');
    expect(inquiryEmbedUrl("https://a.com", "x", {})).toBe("https://a.com/embed/inquiry/x");
  });

  it("turns the address back into colour variables and a flat card", () => {
    const { vars, flat } = embedStyleVars("?bg=transparent&text=%23222222&accent=%23b8860b");
    expect(flat).toBe(true);
    expect(vars["--foreground"]).toBe("0 0% 13%");
    expect(vars["--primary"]).toMatch(/^\d+ \d+% \d+%$/);
    expect(embedStyleVars("?text=javascript").vars).toEqual({});
    expect(hexToHsl("#ffffff")).toEqual({ h: 0, s: 0, l: 100 });
  });

  it("loader forwards the same options", () => {
    const js = fs.readFileSync("public/embed.js", "utf8");
    expect(js).toContain('data-bg');
    expect(js).toContain('"text", "accent", "fields"');
  });
});
