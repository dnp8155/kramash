import { describe, it, expect } from "vitest";
import { parseVideoUrl, safeUrl, normalizeSections, publicSections, firstSectionError, maxItemsFor, parseMapUrl as parseMap } from "@/lib/publicSections";

describe("parseVideoUrl", () => {
  it("reads common YouTube link shapes", () => {
    const id = "dQw4w9WgXcQ";
    for (const u of [`https://www.youtube.com/watch?v=${id}`, `https://youtu.be/${id}?t=5`, `https://youtube.com/shorts/${id}`, `https://m.youtube.com/embed/${id}`, `youtube.com/watch?v=${id}&list=x`]) {
      expect(parseVideoUrl(u)).toEqual({ provider: "youtube", id });
    }
  });
  it("reads Vimeo and rejects everything else", () => {
    expect(parseVideoUrl("https://vimeo.com/123456789")).toEqual({ provider: "vimeo", id: "123456789" });
    expect(parseVideoUrl("https://example.com/watch?v=dQw4w9WgXcQ")).toBeNull();
    expect(parseVideoUrl("https://evil.com/youtube.com/watch?v=dQw4w9WgXcQ")).toBeNull();
    expect(parseVideoUrl("javascript:alert(1)")).toBeNull();
    expect(parseVideoUrl("")).toBeNull();
  });
});

describe("safeUrl", () => {
  it("adds https and blocks other schemes", () => {
    expect(safeUrl("example.com/a")).toBe("https://example.com/a");
    expect(safeUrl("javascript:alert(1)")).toBe("");
    expect(safeUrl("data:text/html,x")).toBe("");
    expect(safeUrl("  ")).toBe("");
  });
});

describe("sections", () => {
  it("drops unknown types, caps sizes, and hides empty or hidden sections from visitors", () => {
    const raw = [
      { id: "a", type: "videos", title: "Films", items: [{ url: "https://youtu.be/dQw4w9WgXcQ", title: "x" }, { url: "", title: "" }] },
      { id: "b", type: "bogus", items: [] },
      { id: "c", type: "faq", title: "FAQ", visible: false, items: [{ q: "q", a: "a" }] },
      { id: "d", type: "links", title: "L", items: [{ title: "T", url: "javascript:1", note: "" }] },
    ];
    expect(normalizeSections(raw)).toHaveLength(3);
    const pub = publicSections(raw);
    expect(pub.map((s) => s.id)).toEqual(["a"]);
    expect(pub[0].items).toHaveLength(1);
  });
  it("reports the first invalid link", () => {
    expect(firstSectionError(normalizeSections([{ type: "videos", title: "V", items: [{ url: "https://example.com", title: "" }] }]))).toMatch(/YouTube or Vimeo/);
    expect(firstSectionError([])).toBe("");
  });
});

describe("parseMapUrl", () => {
  it("embeds full Google Maps links by place name and coordinates", async () => {
    const { parseMapUrl } = await import("@/lib/publicSections");
    const place = parseMapUrl("https://www.google.com/maps/place/Studio+One,+Andheri/@19.1197,72.8464,17z/data=!3m1!4b1!4m6!3m5!1s0x0:0x1!8m2!3d19.11!4d72.84");
    expect(place.embed).toMatch(/^https:\/\/www\.google\.com\/maps\/embed\?origin=mfe&pb=/);
    expect(place.embed).toContain("!2d72.84!3d19.11");
    expect(place.embed).toContain("!1sStudio+One,+Andheri");
    expect(parseMapUrl("https://www.google.com/maps/@19.1197,72.8464,17z").embed).toContain("!1s19.1197,72.8464");
    expect(parseMapUrl("https://www.google.com/maps?q=Gateway+of+India").embed).toContain("Gateway");
  });
  it("accepts embed snippets, opens short links, and rejects other sites", async () => {
    const { parseMapUrl } = await import("@/lib/publicSections");
    const snippet = '<iframe src="https://www.google.com/maps/embed?pb=!1m18&amp;x=1" width="600"></iframe>';
    expect(parseMapUrl(snippet).embed).toBe("https://www.google.com/maps/embed?pb=!1m18&x=1");
    expect(parseMapUrl("https://maps.app.goo.gl/AbC123")).toEqual({ embed: null, open: "https://maps.app.goo.gl/AbC123" });
    expect(parseMapUrl("https://evil.com/maps/place/x")).toBeNull();
    expect(parseMapUrl("https://google.com.evil.com/maps?q=x")).toBeNull();
    expect(parseMapUrl("javascript:alert(1)")).toBeNull();
  });
});

describe("map size", () => {
  it("defaults to big and only accepts small or big", () => {
    const sec = (size) => normalizeSections([{ type: "map", title: "M", items: [{ url: "https://www.google.com/maps?q=x", title: "", size }] }])[0].items[0].size;
    expect(sec(undefined)).toBe("big");
    expect(sec("small")).toBe("small");
    expect(sec("huge")).toBe("big");
  });
});

describe("section limits (v1.1.8)", () => {
  const sec = (type, n, extra = {}) => ({ id: `${type}-${n}`, type, title: type, visible: true, items: Array.from({ length: n }, () => ({ url: "https://youtu.be/dQw4w9WgXcQ", title: "x", name: "a", quote: "b", q: "c", a: "d" })), ...extra });
  it("limits items per section kind", () => {
    expect([maxItemsFor("videos"), maxItemsFor("testimonials"), maxItemsFor("faq"), maxItemsFor("map"), maxItemsFor("services")]).toEqual([4, 6, 8, 1, 12]);
    const out = normalizeSections([sec("videos", 10), sec("testimonials", 10), sec("faq", 20), sec("map", 3)]);
    expect(out.map((s) => s.items.length)).toEqual([4, 6, 8, 1]);
  });
  it("keeps only the first map section", () => {
    const out = normalizeSections([sec("map", 1, { id: "m1" }), sec("videos", 1), sec("map", 1, { id: "m2" })]);
    expect(out.filter((s) => s.type === "map").map((s) => s.id)).toEqual(["m1"]);
  });
  it("only embeds Google's own map domains", () => {
    expect(parseMap("https://www.google.com/maps/embed?pb=!1m3")?.embed).toBeTruthy();
    expect(parseMap("https://www.google.co.in/maps/place/Surat")?.embed).toBeTruthy();
    expect(parseMap("https://google.xyz/maps/embed?pb=1")).toBeNull();
    expect(parseMap("https://google.evil.com/maps/embed?pb=1")).toBeNull();
  });
});
