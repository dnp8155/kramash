import { describe, it, expect, vi, beforeEach } from "vitest";

// Pictures kept on this device: a fake store stands in for IndexedDB.
const store = new Map();
vi.mock("@/lib/localImages", () => ({
  getLocalImageDataUrl: async (id) => store.get(id) || "",
}));
vi.mock("@/lib/edgeFunction", () => ({ invokeEdgeFunction: vi.fn(async () => { throw new Error("offline"); }) }));
vi.mock("@/lib/imageShrink", () => ({ blobToDataUrl: async () => "", downscale: async (d) => d }));

import { prepareTemplateImages } from "@/lib/templateImages";

beforeEach(() => { store.clear(); });

describe("prepareTemplateImages with pictures from the device", () => {
  it("embeds device pictures from the on-device store without any network", async () => {
    store.set("abc", "data:image/jpeg;base64,AAA");
    const { templateConfig, failed } = await prepareTemplateImages({ images: [{ url: "", local: "abc", localName: "shoot.jpg", caption: "Cover" }] });
    expect(failed).toEqual([]);
    expect(templateConfig.images).toEqual([{ url: "data:image/jpeg;base64,AAA", caption: "Cover" }]);
  });

  it("leaves a picture out and reports it when it isn't on this device", async () => {
    const { templateConfig, failed } = await prepareTemplateImages({ images: [{ url: "", local: "gone", localName: "other-phone.jpg", caption: "" }] });
    expect(templateConfig.images).toEqual([]);
    expect(failed).toEqual(["device:other-phone.jpg"]);
  });

  it("works inside the Custom template's Pictures blocks too, and caps at 3", async () => {
    ["a", "b", "c", "d"].forEach((k) => store.set(k, `data:image/jpeg;base64,${k}`));
    const cfg = { custom: { blocks: [{ type: "text" }, { type: "images", images: ["a", "b", "c", "d"].map((k) => ({ local: k })) }] } };
    const { templateConfig } = await prepareTemplateImages(cfg);
    const pics = templateConfig.custom.blocks[1].images;
    expect(pics).toHaveLength(3);
    expect(pics[0].url).toBe("data:image/jpeg;base64,a");
  });

  it("keeps a missing device picture from blocking the ones that are there", async () => {
    store.set("ok", "data:image/jpeg;base64,OK");
    const { templateConfig, failed } = await prepareTemplateImages({ images: [{ local: "ok" }, { local: "nope", localName: "x.jpg" }] });
    expect(templateConfig.images).toHaveLength(1);
    expect(failed).toEqual(["device:x.jpg"]);
  });
});
