import { describe, it, expect } from "vitest";
import { getInitials } from "@/utils/format";

describe("getInitials", () => {
  it("ignores bracketed labels and punctuation", () => {
    expect(getInitials("Abc (xyz)")).toBe("A");
    expect(getInitials("Ravi Kumar (Lead)")).toBe("RK");
    expect(getInitials("(Abc) Studio")).toBe("S");
    expect(getInitials("  Abc   Xyz ")).toBe("AX");
    expect(getInitials("A. B. Sharma")).toBe("AB");
    expect(getInitials("priya patel")).toBe("PP");
  });
  it("handles single-letter mode, other scripts and empty names", () => {
    expect(getInitials("Abc (xyz)", 1)).toBe("A");
    expect(getInitials("ક્રિષ્ણા શાહ")).toHaveLength(2);
    expect(getInitials("(xyz)")).toBe("X");
    expect(getInitials("")).toBe("?");
    expect(getInitials(null)).toBe("?");
  });
});
