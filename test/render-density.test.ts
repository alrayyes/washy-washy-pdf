import { describe, expect, test } from "bun:test";
import { resolve } from "@washy-washy/core/browser";
import { densityFont, MIN_FONT_SIZE } from "../src/documents";
import { renderPrint } from "../src/render";
import { MACHINE, pile } from "./fixtures";

// #12: fittingDensity bisected all the way down to a fixed TIGHTEST with no
// floor — at the tightest setting the matrix codes rendered at 4.2pt, below
// anything printed Helvetica is readable at.
describe("densityFont", () => {
  // Every base size documents.tsx actually scales with density.
  const bases = [6, 6.5, 6.6, 6.8];

  test("never returns below MIN_FONT_SIZE, however low density goes", () => {
    for (const base of bases) {
      for (const density of [1, 0.9, 0.7, 0.5, 0.1, 0]) {
        expect(densityFont(base, density)).toBeGreaterThanOrEqual(MIN_FONT_SIZE);
      }
    }
  });

  test("still shrinks with density above the floor", () => {
    expect(densityFont(6.8, 0.9)).toBeLessThan(6.8);
    expect(densityFont(6.8, 0.9)).toBeGreaterThan(MIN_FONT_SIZE);
  });

  test("holds at the floor once density would take it below", () => {
    // 6 * 0.9 = 5.4, under the floor — this is exactly what rendered at
    // 4.2pt before the fix (6 * 0.7).
    expect(densityFont(6, 0.9)).toBe(MIN_FONT_SIZE);
  });
});

describe("renderPrint at extreme density", () => {
  // Enough piles that even the tightest density can't fit the reference
  // sheet on one page (confirmed empirically: comfortably over the ~45-pile
  // threshold). Before the fix this threw; now it should flow onto a second
  // page instead of shrinking type past the floor.
  test("flows onto more pages rather than throwing when even the floor doesn't fit", async () => {
    const items = resolve(Array.from({ length: 50 }, (_, index) => pile(index + 1)));

    const { pdf: bytes } = await renderPrint(items, MACHINE);
    const { PDFDocument } = await import("pdf-lib");
    const doc = await PDFDocument.load(bytes);

    expect(doc.getPageCount()).toBeGreaterThan(1);
  }, 60_000);
});
