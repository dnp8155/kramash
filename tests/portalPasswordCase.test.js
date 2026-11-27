import { describe, it, expect } from "vitest";
import { passwordCandidates, tryPasswordCandidates } from "@/lib/portalShare";

describe("portal password: small letters work too", () => {
  it("tries as typed, then trimmed, then CAPITALS", () => {
    expect(passwordCandidates(" ab3k9xyz ")).toEqual([" ab3k9xyz ", "ab3k9xyz", "AB3K9XYZ"]);
    expect(passwordCandidates("AB3K9XYZ")).toEqual(["AB3K9XYZ"]);
    expect(passwordCandidates("")).toEqual([]);
  });
  it("signs in with the CAPITALS form when small letters were typed", async () => {
    const tried = [];
    const run = async (pw) => { tried.push(pw); if (pw !== "AB3K9XYZ") throw new Error("Incorrect password"); return { ok: true }; };
    const out = await tryPasswordCandidates("ab3k9xyz", run);
    expect(out).toEqual({ result: { ok: true }, password: "AB3K9XYZ" });
    expect(tried).toEqual(["ab3k9xyz", "AB3K9XYZ"]);
  });
  it("a custom mixed-case password still works exactly as typed (first try)", async () => {
    const run = async (pw) => ({ requires_auth: pw !== "MyPass12" });
    const out = await tryPasswordCandidates("MyPass12", run, (r) => r.requires_auth);
    expect(out.password).toBe("MyPass12");
  });
  it("wrong password: refused result comes back; thrown errors keep the first message", async () => {
    const refused = await tryPasswordCandidates("nope", async () => ({ requires_auth: true }), (r) => r.requires_auth);
    expect(refused.result.requires_auth).toBe(true);
    await expect(tryPasswordCandidates("nope", async (pw) => { throw new Error(`bad ${pw}`); })).rejects.toThrow("bad nope");
  });
  it("a disabled link stops at once", async () => {
    let n = 0;
    await expect(tryPasswordCandidates("abc", async () => { n++; throw new Error("This link is no longer active"); })).rejects.toThrow(/no longer active/);
    expect(n).toBe(1);
  });
});
