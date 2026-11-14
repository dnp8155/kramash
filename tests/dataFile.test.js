import { describe, it, expect } from "vitest";
import {
  cleanText, LIMITS, parseAnyDate, parseMoney, normalizeMethod, normalizeKind, normalizeDataFile, summarize,
  buildDataFile, fyLabelsInFile, filterDataByFy, dataFileToCsv, csvToDataFile, parseCsv, exampleDataFile,
} from "@/lib/dataFile";

describe("parseAnyDate", () => {
  it("reads ISO, day-first and written dates", () => {
    expect(parseAnyDate("2026-03-05")).toBe("2026-03-05");
    expect(parseAnyDate("05/03/2026")).toBe("2026-03-05");
    expect(parseAnyDate("5-3-26")).toBe("2026-03-05");
    expect(parseAnyDate("23 Sep 2026")).toBe("2026-09-23");
    expect(parseAnyDate("1 January 2026")).toBe("2026-01-01");
  });
  it("rejects things that are not real dates", () => {
    expect(parseAnyDate("31/02/2026")).toBeNull();
    expect(parseAnyDate("soon")).toBeNull();
    expect(parseAnyDate("")).toBeNull();
  });
});

describe("small helpers", () => {
  it("reads money with symbols and commas", () => {
    expect(parseMoney("₹1,50,000")).toBe(150000);
    expect(Number.isNaN(parseMoney("abc"))).toBe(true);
  });
  it("maps methods and kinds", () => {
    expect(normalizeMethod("gpay").method).toBe("UPI");
    expect(normalizeMethod("NEFT").method).toBe("Bank Transfer");
    expect(normalizeMethod("barter").known).toBe(false);
    expect(normalizeKind("Received")).toBe("received");
    expect(normalizeKind("PAID")).toBe("paid");
    expect(normalizeKind("maybe")).toBeNull();
  });
});

describe("normalizeDataFile", () => {
  it("accepts the bundled example without a single problem", () => {
    const { data, issues } = normalizeDataFile(exampleDataFile());
    expect(issues).toEqual([]);
    expect(summarize(data)).toEqual({ clients: 2, events: 2, payments: 5 });
  });
  it("rejects a file that is not a data file", () => {
    expect(normalizeDataFile([]).issues[0].level).toBe("error");
    expect(normalizeDataFile({ format: "something-else", events: [] }).issues[0].level).toBe("error");
    expect(normalizeDataFile({ hello: 1 }).issues[0].level).toBe("error");
  });
  it("skips bad rows and says why, keeping the good ones", () => {
    const { data, issues } = normalizeDataFile({
      format: "kramasha-data", events: [
        { title: "Good", client: "A", dates: ["2026-01-01"], payments: [{ date: "2026-01-02", kind: "received", amount: 100 }, { date: "nope", kind: "paid", amount: 5 }, { date: "2026-01-03", kind: "paid", amount: 0 }] },
        { title: "No date", client: "A", dates: [] },
        { client: "A", dates: ["2026-01-01"] },
      ],
      misc: [{ date: "2026-02-01", kind: "paid", amount: 10 }],
    });
    expect(data.events).toHaveLength(1);
    expect(data.events[0].payments).toHaveLength(1);
    expect(data.misc).toHaveLength(0);
    expect(issues.filter((i) => i.level === "error")).toHaveLength(5);
  });
  it("uses the event title when no client is given, and merges repeat clients", () => {
    const { data, issues } = normalizeDataFile({
      format: "kramasha-data", clients: [{ name: "Raj", phone: "1" }],
      events: [{ title: "Solo shoot", dates: ["2026-01-01"] }, { client: "raj", title: "Raj 2", dates: ["2026-02-01"] }],
    });
    expect(data.clients.map((c) => c.name)).toEqual(["Raj", "Solo shoot"]);
    expect(issues.filter((i) => i.level === "warning")).toHaveLength(1);
  });
  it("sorts and de-duplicates event dates", () => {
    const { data } = normalizeDataFile({ format: "kramasha-data", events: [{ title: "T", client: "C", dates: ["2026-03-06", "6 Mar 2026", "2026-03-05"] }] });
    expect(data.events[0].dates).toEqual(["2026-03-05", "2026-03-06"]);
  });
});

describe("CSV", () => {
  it("reads quoted cells with commas, quotes and line breaks", () => {
    expect(parseCsv('a,"b, c","say ""hi""","x\ny"\r\n1,2,3,4')).toEqual([["a", "b, c", 'say "hi"', "x\ny"], ["1", "2", "3", "4"]]);
  });
  it("round-trips the example through CSV unchanged", () => {
    const original = normalizeDataFile(exampleDataFile()).data;
    const csv = dataFileToCsv(exampleDataFile());
    const { file, error } = csvToDataFile(csv);
    expect(error).toBeUndefined();
    const { data, issues } = normalizeDataFile(file);
    expect(issues).toEqual([]);
    expect(summarize(data)).toEqual(summarize(original));
    expect(data.events[0].payments.map((p) => p.amount)).toEqual([50000, 80000, 12000]);
    expect(data.misc.map((m) => m.category)).toEqual(["Studio rent", "Print sales"]);
    expect(data.clients.find((c) => c.name === "Rohan Mehta").phone).toBe("9876500000");
  });
  it("explains a CSV with no usable header", () => {
    expect(csvToDataFile("foo,bar\n1,2").error).toMatch(/column names/);
    expect(csvToDataFile("").error).toMatch(/no rows/);
  });
});

describe("buildDataFile", () => {
  const clients = [{ id: "c1", name: "Rohan", phone: "9" }];
  const events = [{ id: "e1", client_id: "c1", title: "Wedding", event_type: "Wedding", start_date: "2026-02-08", event_dates: ["2026-02-09", "2026-02-08"], contract_value: "1000", status: "completed" }];
  const transactions = [
    { id: "t1", event_id: "e1", transaction_type: "CLIENT_RECEIPT", amount: "400", payment_method: "UPI", transaction_date: "2026-02-01", notes: "Advance", status: "ACTIVE" },
    { id: "t2", event_id: "e1", transaction_type: "TEAM_PAYMENT", team_member_id: "m1", amount: 100, transaction_date: "2026-02-10", status: "ACTIVE" },
    { id: "t3", event_id: "e1", transaction_type: "BUSINESS_EXPENSE", amount: 50, transaction_date: "2026-02-11", status: "VOID" },
    { id: "t4", transaction_type: "BUSINESS_EXPENSE", expense_category_name_snapshot: "Rent", amount: 900, transaction_date: "2026-04-01", status: "ACTIVE" },
  ];
  it("builds a file that passes its own check", () => {
    const file = buildDataFile({ clients, events, transactions, membersById: { m1: { name: "Amit" } } });
    const { data, issues } = normalizeDataFile(file);
    expect(issues).toEqual([]);
    expect(data.events[0].dates).toEqual(["2026-02-08", "2026-02-09"]);
    expect(data.events[0].payments.map((p) => [p.kind, p.amount, p.note])).toEqual([["received", 400, "Advance"], ["paid", 100, "Payment to Amit"]]);
    expect(data.misc).toEqual([{ date: "2026-04-01", kind: "paid", amount: 900, method: "Cash", category: "Rent" }]);
  });
});

describe("picking a financial year from a file", () => {
  const { data } = normalizeDataFile({
    format: "kramasha-data", events: [
      { title: "A", client: "Ca", dates: ["2025-05-01"], payments: [{ date: "2026-06-01", kind: "received", amount: 10 }] },
      { title: "B", client: "Cb", dates: ["2026-04-10"], payments: [] },
    ],
    clients: [{ name: "Loose" }],
    misc: [{ date: "2025-08-01", kind: "paid", amount: 5, category: "Rent" }, { date: "2026-08-01", kind: "paid", amount: 6, category: "Rent" }],
  });
  it("lists the years that appear in the file", () => {
    expect(fyLabelsInFile(data)).toEqual(["2025-26", "2026-27"]);
  });
  it("keeps one year with its events, their later payments, its misc entries and only the clients it uses", () => {
    const one = filterDataByFy(data, "2025-26");
    expect(one.events.map((e) => e.title)).toEqual(["A"]);
    expect(one.events[0].payments).toHaveLength(1);
    expect(one.misc.map((m) => m.amount)).toEqual([5]);
    expect(one.clients.map((c) => c.name)).toEqual(["Ca"]);
  });
  it("returns everything for all years", () => {
    expect(filterDataByFy(data, "all")).toBe(data);
  });
});

describe("only a real Kramasha file is accepted", () => {
  const good = { format: "kramasha-data", version: 1 };
  it("rejects a file without the format marker, or with a different or newer one", () => {
    expect(normalizeDataFile({ events: [{ title: "T", dates: ["2026-01-01"] }] }).issues[0].message).toMatch(/not marked/);
    expect(normalizeDataFile({ format: "backup", events: [] }).issues[0].level).toBe("error");
    expect(normalizeDataFile({ ...good, version: 9, events: [] }).issues[0].message).toMatch(/different version/);
  });
  it("reads only known fields and says which sections it ignored", () => {
    const { data, issues } = normalizeDataFile({
      ...good, scripts: ["alert(1)"], WorkspaceSubscription: [{ plan: "pro" }],
      events: [{ title: "T", client: "C", dates: ["2026-01-01"], id: "x", workspace_id: "other", plan_type: "pro", payments: [] }],
    });
    expect(Object.keys(data.events[0]).sort()).toEqual(["client", "contract_value", "dates", "notes", "payments", "status", "title", "type", "venue"]);
    expect(issues.some((i) => /scripts, WorkspaceSubscription/.test(i.message))).toBe(true);
  });
  it("is not fooled by prototype tricks", () => {
    const raw = JSON.parse('{"format":"kramasha-data","__proto__":{"polluted":1},"events":[{"title":"T","dates":["2026-01-01"],"__proto__":{"x":1}}]}');
    normalizeDataFile(raw);
    expect({}.polluted).toBeUndefined();
    expect({}.x).toBeUndefined();
  });
  it("refuses oversized files", () => {
    const events = Array.from({ length: LIMITS.events + 1 }, (_, i) => ({ title: "E" + i, dates: ["2026-01-01"] }));
    expect(normalizeDataFile({ ...good, events }).issues[0].message).toMatch(/too many records/);
  });
  it("drops absurd amounts and contract values", () => {
    const { data, issues } = normalizeDataFile({ ...good, events: [{ title: "T", client: "C", dates: ["2026-01-01"], contract_value: 1e12, payments: [] }, { title: "U", client: "C", dates: ["2026-01-01"], payments: [{ date: "2026-01-01", kind: "paid", amount: 1e12 }] }] });
    expect(data.events.map((e) => e.title)).toEqual(["U"]);
    expect(data.events[0].payments).toHaveLength(0);
    expect(issues.filter((i) => i.level === "error")).toHaveLength(2);
  });
});

describe("text from a file is cleaned", () => {
  it("removes tags, control characters and hidden direction characters", () => {
    expect(cleanText("<script>alert(1)</script>Rohan")).toBe("alert(1)Rohan");
    expect(cleanText("Ro\u0000han\u202Egnp.exe")).toBe("Ro han" + "gnp.exe");
    expect(cleanText("A\u200Bb")).toBe("Ab");
    expect(cleanText("<img src=x onerror=alert(1)>Hi")).toBe("Hi");
  });
  it("defuses spreadsheet formulas", () => {
    expect(cleanText("=HYPERLINK(\"http://evil\",\"x\")")).toBe("HYPERLINK(\"http://evil\",\"x\")");
    expect(cleanText("+1+1")).toBe("1+1");
    expect(cleanText("@SUM(A1)")).toBe("SUM(A1)");
    expect(cleanText("-cmd|calc")).toBe("cmd|calc");
    expect(cleanText("-5 advance")).toBe("-5 advance");
  });
  it("keeps normal text and line breaks in notes, and caps the length", () => {
    expect(cleanText("Rohan & Isha (Vadodara)")).toBe("Rohan & Isha (Vadodara)");
    expect(cleanText("line 1\nline 2", 100, { multiline: true })).toBe("line 1\nline 2");
    expect(cleanText("x".repeat(500), 50)).toHaveLength(50);
  });
  it("keeps only plausible phone numbers and emails", () => {
    const { data } = normalizeDataFile({ format: "kramasha-data", clients: [{ name: "A", phone: "98765 00000<script>", email: "not an email" }, { name: "B", email: "b@example.com" }] });
    expect(data.clients[0].phone).toBe("98765 00000");
    expect(data.clients[0].email).toBe("");
    expect(data.clients[1].email).toBe("b@example.com");
  });
  it("a CSV with formula-looking text is safe both ways", () => {
    const file = { format: "kramasha-data", version: 1, clients: [], events: [{ client: "C", title: "T", type: "", dates: ["2026-01-01"], venue: "", contract_value: 0, status: "", payments: [{ date: "2026-01-02", kind: "paid", amount: 5, method: "Cash", note: "=2+2" }] }], misc: [] };
    const csv = dataFileToCsv(file);
    expect(csv).toContain("'=2+2");
    const back = normalizeDataFile(csvToDataFile(csv).file).data;
    expect(back.events[0].payments[0].note).toBe("2+2");
  });
});
