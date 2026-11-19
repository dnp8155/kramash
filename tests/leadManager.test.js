import { describe, it, expect } from "vitest";
import { classifyFollowUps, buildLeadMessage, computeLeadInsights, leadDates } from "@/lib/leadManager";

const lead = (o) => ({ id: Math.random().toString(36).slice(2), name: "Priya Shah", status: "new", ...o });

describe("classifyFollowUps", () => {
  it("splits open leads into overdue and due today, oldest first, and ignores closed ones", () => {
    const leads = [
      lead({ id: "a", next_followup_date: "2026-10-10" }),
      lead({ id: "b", next_followup_date: "2026-10-12" }),
      lead({ id: "c", next_followup_date: "2026-10-08" }),
      lead({ id: "d", next_followup_date: "2026-10-13" }),               // future
      lead({ id: "e", next_followup_date: "2026-10-01", status: "won" }), // closed
      lead({ id: "f", next_followup_date: "2026-10-01", status: "lost" }),
      lead({ id: "g" }),                                                   // no follow-up
    ];
    const r = classifyFollowUps(leads, "2026-10-12");
    expect(r.overdue.map((l) => l.id)).toEqual(["c", "a"]);
    expect(r.today.map((l) => l.id)).toEqual(["b"]);
  });
});

describe("buildLeadMessage", () => {
  it("fills the name (first name), business, event and date", () => {
    const m = buildLeadMessage("available", { lead: lead({ event_type: "Wedding" }), business: "Studio Aarav", dateText: "12 Dec 2026" });
    expect(m).toBe("Hi Priya, good news — we're available on 12 Dec 2026 for your wedding. Shall I send over the details and a quotation? — Studio Aarav");
  });
  it("drops optional parts when the lead has no event type or date, and stays readable", () => {
    const m = buildLeadMessage("intro", { lead: lead({}), business: "Studio Aarav" });
    expect(m).toBe("Hi Priya, thank you for reaching out to Studio Aarav! We'd love to help. When would be a good time to talk?");
    expect(m).not.toMatch(/\{|\[\[|\]\]/);
  });
  it("falls back sensibly when there is no name or business", () => {
    const m = buildLeadMessage("followup", { lead: { name: "" } });
    expect(m).toContain("Hi there");
    expect(m).toContain("our team");
  });
});

describe("computeLeadInsights", () => {
  const leads = [
    lead({ status: "won", source: "referral" }), lead({ status: "won", source: "referral" }),
    lead({ status: "lost", source: "social_media", lost_reason: "price" }),
    lead({ status: "lost", source: "social_media", lost_reason: "price" }),
    lead({ status: "lost", source: "referral", lost_reason: "no_response" }),
    lead({ status: "lost", source: "other" }),
    lead({ status: "new", source: "social_media" }), lead({ status: "negotiation", source: "referral" }),
  ];
  it("computes the conversion rate from decided leads only", () => {
    const r = computeLeadInsights(leads);
    expect(r.total).toBe(8); expect(r.active).toBe(2); expect(r.won).toBe(2); expect(r.lost).toBe(4);
    expect(r.conversionRate).toBe(33); // 2 won out of 6 decided
  });
  it("counts each stage, lost reasons (most common first) and sources", () => {
    const r = computeLeadInsights(leads);
    expect(r.stages.find((s) => s.status === "lost").count).toBe(4);
    expect(r.lostReasons[0]).toEqual({ reason: "price", count: 2 });
    expect(r.lostReasons.some((x) => x.reason === "unspecified")).toBe(true);
    expect(r.sources.find((s) => s.source === "referral")).toEqual({ source: "referral", total: 4, won: 2 });
  });
  it("has no rate yet when nothing is decided", () => {
    expect(computeLeadInsights([lead({}), lead({ status: "contacted" })]).conversionRate).toBeNull();
    expect(computeLeadInsights([]).total).toBe(0);
  });
});

describe("leadDates", () => {
  it("prefers the list of dates, falls back to the single date, sorted", () => {
    expect(leadDates({ event_dates: ["2026-12-03", "2026-12-01"] })).toEqual(["2026-12-01", "2026-12-03"]);
    expect(leadDates({ event_date: "2026-12-05" })).toEqual(["2026-12-05"]);
    expect(leadDates({})).toEqual([]);
  });
});
