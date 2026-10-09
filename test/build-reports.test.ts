import { describe, expect, test } from "bun:test";
import { coverageIndex, parseLcov, reportsIndex } from "../scripts/build-reports.ts";

const LCOV = `TN:
SF:src/a.ts
FNF:2
FNH:1
LF:10
LH:8
end_of_record
SF:src/b<x>.ts
FNF:0
FNH:0
LF:4
LH:4
end_of_record
`;

describe("parseLcov", () => {
  test("reads lines found and hit per file", () => {
    expect(parseLcov(LCOV)).toEqual([
      { file: "src/a.ts", found: 10, hit: 8 },
      { file: "src/b<x>.ts", found: 4, hit: 4 },
    ]);
  });

  test("returns nothing for an empty report", () => {
    expect(parseLcov("")).toEqual([]);
  });
});

describe("coverageIndex", () => {
  const html = coverageIndex(parseLcov(LCOV));

  test("totals the line coverage", () => {
    expect(html).toContain("85.7%");
  });

  test("escapes file names", () => {
    expect(html).toContain("src/b&lt;x&gt;.ts");
    expect(html).not.toContain("<x>");
  });

  test("links the raw files", () => {
    expect(html).toContain('href="coverage.xml"');
    expect(html).toContain('href="lcov.info"');
  });

  test("does not divide by zero", () => {
    expect(coverageIndex([])).toContain("0.0%");
  });
});

describe("reportsIndex", () => {
  const html = reportsIndex("abc1234", "2026-10-09");

  test("shows the commit and date", () => {
    expect(html).toContain("abc1234");
    expect(html).toContain("2026-10-09");
  });

  test("links each report", () => {
    expect(html).toContain('href="tests/unit.xml"');
    expect(html).toContain('href="coverage/"');
    expect(html).toContain('href="coverage/coverage.xml"');
  });
});
