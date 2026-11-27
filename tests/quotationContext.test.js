import { describe, it, expect } from "vitest";
import { contextDisplay, contextValueLabel, contextSuggestions } from "@/lib/quotationContext";

describe("quotation Side / Context", () => {
  it("shows old saved keys as their label", () => {
    expect(contextDisplay("bride_side")).toBe("Bride Side");
    expect(contextDisplay("common")).toBe("Common");
    expect(contextDisplay("other")).toBe("Others");
    expect(contextDisplay("office")).toBe("Office");
  });
  it("prints typed text as is, and nothing for empty or None", () => {
    expect(contextDisplay("Mehendi Side")).toBe("Mehendi Side");
    expect(contextDisplay("")).toBe("");
    expect(contextDisplay("None")).toBe("");
    expect(contextValueLabel("None")).toBe("None");
  });
  it("suggests the member types from Preferences, Common, None and earlier values", () => {
    const ws = { team_member_types: JSON.stringify([{ id: "a", title: "Bride Side" }, { id: "b", title: "Groom Side" }]) };
    expect(contextSuggestions(ws, ["groom_side", "Family"])).toEqual(["Bride Side", "Groom Side", "Common", "None", "Groom Side", "Family"]);
  });
});
