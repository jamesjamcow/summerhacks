import { describe, expect, it } from "vitest";
import { fuzzyScore, fuzzySearch } from "../fuzzySearch";

describe("fuzzyScore", () => {
  it("matches when query characters appear in order", () => {
    expect(fuzzyScore("gtr", "Beat-Up Guitar")).not.toBeNull();
    expect(fuzzyScore("cap", "Faded Baseball Cap")).not.toBeNull();
  });

  it("returns null when characters are out of order or missing", () => {
    expect(fuzzyScore("xyz", "Beat-Up Guitar")).toBeNull();
    expect(fuzzyScore("ratg", "Guitar")).toBeNull();
  });

  it("scores contiguous/early matches higher than scattered ones", () => {
    const contiguous = fuzzyScore("guit", "Guitar");
    const scattered = fuzzyScore("gtr", "Guitar");
    expect(contiguous).not.toBeNull();
    expect(scattered).not.toBeNull();
    expect(contiguous as number).toBeGreaterThan(scattered as number);
  });

  it("treats an empty query as matching everything with score 0", () => {
    expect(fuzzyScore("", "anything")).toBe(0);
  });
});

describe("fuzzySearch", () => {
  const items = [
    { name: "Beat-Up Guitar" },
    { name: "Faded Baseball Cap" },
    { name: "Cracked Skateboard" },
  ];

  it("filters out non-matching items and sorts by score descending", () => {
    const results = fuzzySearch(items, "cap", (item) => item.name);
    expect(results.map((r) => r.item.name)).toContain("Faded Baseball Cap");
    expect(results.every((r, i) => i === 0 || r.score <= results[i - 1].score)).toBe(
      true,
    );
  });

  it("returns all items unscored when query is blank", () => {
    const results = fuzzySearch(items, "", (item) => item.name);
    expect(results).toHaveLength(items.length);
  });

  it("excludes items with no subsequence match", () => {
    const results = fuzzySearch(items, "zzz", (item) => item.name);
    expect(results).toHaveLength(0);
  });
});
