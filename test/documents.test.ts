import { describe, expect, test } from "bun:test";
import { resolve, variants } from "@washy-washy/core/browser";
import { summaryColumns, TABLE_WIDTH_BUDGET } from "../src/documents";
import { renderPrint } from "../src/render";
import { MACHINE, pile } from "./fixtures";
import { inkPerPage, pageText } from "./pdf-text";

/** Same gutter `SummaryTable` gives the row-number column. */
const ROW_NUMBER_GUTTER = 14;

describe("Card temperature", () => {
  // #10: the card hardcoded the Dutch "koud" for a cold wash instead of
  // reading the machine's own word, so a machine that says "cold" printed
  // the literal word "koud" nowhere and "cold °C" instead — the unit
  // tacked onto a word that was never a number.
  test("shows the machine's own word for a non-numeric temperature, no unit", async () => {
    const items = resolve([pile(1, { temperature: "cold" })]);
    const text = (await pageText((await renderPrint(items, MACHINE)).pdf)).join("\n");

    expect(text).toContain("Cottons cold ·");
    expect(text).not.toContain("cold °C");
    expect(text).not.toContain("koud");
  });

  test("still shows a numeric temperature with its unit", async () => {
    const items = resolve([pile(1, { temperature: "60" })]);
    const text = (await pageText((await renderPrint(items, MACHINE)).pdf)).join("\n");

    expect(text).toContain("Cottons 60 °C ·");
  });
});

describe("summaryColumns", () => {
  // #15: the widths are laid out by hand, not flexed, so nothing stops them
  // drifting past the page's printable width except this test — the "full"
  // and "wash" variants had already overrun it by 5pt before this landed.
  for (const variant of variants) {
    test(`${variant} stays within the table width budget`, () => {
      const width = summaryColumns(MACHINE, variant).reduce(
        (total, column) => total + column.width,
        ROW_NUMBER_GUTTER,
      );

      expect(width).toBeLessThanOrEqual(TABLE_WIDTH_BUDGET);
    });
  }
});

describe("Loads bold-group caption", () => {
  // #25: bold pile names meant "these share one wash," with no explanation
  // on the page — the only cue was the "(on its own)" suffix on solo rows,
  // which says nothing about what the absence of that suffix, plus bold
  // type, is supposed to mean.
  test("explains what bold means, without pushing the reference sheet onto a near-blank overflow page", async () => {
    const items = resolve([pile(1), pile(2, { clothingType: "Pile 2" })]);
    const result = await renderPrint(items, MACHINE);
    const text = (await pageText(result.pdf)).join("\n");

    expect(text).toContain("share one wash");
    // Same guard #26 added for the legend row: a caption that quietly grows
    // the reference sheet's own section past one page leaves a near-blank
    // page behind rather than failing outright.
    expect((await inkPerPage(result.pdf)).filter((ink) => ink < 1000)).toEqual([]);
  });
});
