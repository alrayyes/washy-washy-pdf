import { describe, expect, test } from "bun:test";
import { resolve, variants } from "@washy-washy/core/browser";
import { PDFDocument } from "pdf-lib";
import { renderPhone, renderPrint } from "../src/render";
import { MACHINE, pile } from "./fixtures";
import { pageText } from "./pdf-text";

// #19: renderPrint's own overflow proxy was the only thing exercising this
// package beyond component-level assumptions — renderPhone had no test at
// all, and nothing rendered the "wash" or "iron" cuts, which is exactly the
// gap that let the "koud" bug (#10) and the table-width overrun (#15) both
// ship before a chart ever surfaced them.

describe("renderPhone contract", () => {
  for (const variant of variants) {
    test(`${variant}: fits on one page, and reports a sane height/attempts`, async () => {
      const items = resolve(Array.from({ length: 3 }, (_, index) => pile(index + 1)));
      const { pdf, height, attempts } = await renderPhone(items, MACHINE, variant);

      expect((await PDFDocument.load(pdf)).getPageCount()).toBe(1);
      // Not zero (a height the bisection never actually grew from) and not
      // wildly larger than the page ever needs to be — a regression that
      // made guessHeight or the bisection loop runaway should fail this.
      expect(height).toBeGreaterThan(0);
      expect(height).toBeLessThan(20_000);
      // The growth phase caps at 12 passes and the bisection tolerance is
      // tight enough that this chart shouldn't need many more — a bound
      // generous enough to never flake, tight enough to catch a loop that
      // stopped converging.
      expect(attempts).toBeGreaterThan(0);
      expect(attempts).toBeLessThan(30);
    });
  }
});

describe("renderPrint across cuts", () => {
  for (const variant of variants) {
    test(`${variant}: renders real content, not a blank sheet`, async () => {
      const items = resolve(Array.from({ length: 3 }, (_, index) => pile(index + 1)));
      const { pdf } = await renderPrint(items, MACHINE, variant);
      const text = (await pageText(pdf)).join("\n");

      expect(text).toContain(MACHINE.washer.name);
      expect(text.length).toBeGreaterThan(200);
    });
  }
});

describe("card text, golden per cut", () => {
  // Actual rendered PDF text, not component props — a formatting regression
  // in the document tree (the "cold °C" bug's whole failure mode) fails this
  // even though nothing throws and no snapshot changed.
  test("full: the fascia line reads programme, temperature and spin together", async () => {
    const items = resolve([pile(1, { temperature: "60", spin: "1200" })]);
    const text = (await pageText((await renderPrint(items, MACHINE, "full")).pdf)).join("\n");

    expect(text).toContain("Cottons 60 °C · 1200 rpm");
  });

  test("wash: the same fascia line renders, with no iron section heading", async () => {
    const items = resolve([pile(1, { temperature: "60", spin: "1200" })]);
    const text = (await pageText((await renderPrint(items, MACHINE, "wash")).pdf)).join("\n");

    expect(text).toContain("Cottons 60 °C · 1200 rpm");
    expect(text).not.toContain("IRON");
  });

  test("iron: the thermostat card names the setting and steam zone", async () => {
    const items = resolve([pile(1, { ironing: true, ironSetting: "3" })]);
    const text = (await pageText((await renderPrint(items, MACHINE, "iron")).pdf)).join("\n");

    expect(text).toContain("High");
    expect(text).toContain("steam zone");
  });

  test("iron: a never-ironed pile reads 'Do not iron', not a blank setting", async () => {
    const items = resolve([pile(1, { ironing: false, ironSetting: "" })]);
    const text = (await pageText((await renderPrint(items, MACHINE, "iron")).pdf)).join("\n");

    expect(text).toContain("Do not iron");
  });
});
