import { describe, expect, test } from "bun:test";
import { resolve } from "@washy-washy/core/browser";
import { fittingDensity, renderPrint } from "../src/render";
import { MACHINE, pile } from "./fixtures";
import { inkPerPage } from "./pdf-text";

describe("renderPrint", () => {
  /**
   * Adding a pile is a CSV edit, and it costs the reference sheet a row in the
   * summary table and another in the matrix. Past fifteen or so piles that runs
   * off the bottom of the A4, and @react-pdf answers a page it cannot fit with
   * an almost empty sheet rather than an error.
   */
  test("keeps the reference sheet on one page as piles pile up", async () => {
    const items = resolve(Array.from({ length: 24 }, (_, index) => pile(index + 1)));

    expect(
      (await inkPerPage((await renderPrint(items, MACHINE)).pdf)).filter((ink) => ink < 1000),
    ).toEqual([]);
  }, 60_000);
});

describe("fittingDensity", () => {
  test("a short chart already fits at the loosest density — no tightening needed", async () => {
    const items = resolve([pile(1)]);

    expect(await fittingDensity(items, MACHINE, "full")).toBe(1);
  });

  test("a long chart tightens to somewhere strictly between the two bounds", async () => {
    // "full"/"wash" jump straight from LOOSEST to TIGHTEST between pile
    // counts (MixMatrix adds a whole row/column at once) — "iron" skips
    // MixMatrix entirely, so SummaryTable's own row-by-row growth actually
    // lands a real bisection in between, confirmed empirically at 50 piles.
    const items = resolve(
      Array.from({ length: 50 }, (_, index) => pile(index + 1, { ironSetting: "1" })),
    );

    const density = await fittingDensity(items, MACHINE, "iron");

    expect(density).toBeGreaterThan(0.7);
    expect(density).toBeLessThan(1);
  }, 60_000);

  test("settles at the tightest density when even that doesn't fit one page", async () => {
    // Same threshold render-density.test.ts confirmed empirically: past
    // this many piles, even TIGHTEST can't keep the reference sheet on one
    // page, and the sheet is left to flow onto a second one instead.
    const items = resolve(Array.from({ length: 50 }, (_, index) => pile(index + 1)));

    expect(await fittingDensity(items, MACHINE, "full")).toBe(0.7);
  }, 60_000);
});
