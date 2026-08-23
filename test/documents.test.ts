import { describe, expect, test } from "bun:test";
import { resolve, variants } from "@washy-washy/core/browser";
import { summaryColumns, TABLE_WIDTH_BUDGET } from "../src/documents";
import { renderPrint } from "../src/render";
import { MACHINE, pile } from "./fixtures";
import { pageText } from "./pdf-text";

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

describe("card reference citation", () => {
  // #30: `Instruction` gained `referenceName`/`referenceLink` (@washy-washy/core@1.3.0)
  // but nothing here drew them — a chart carrying real citations still
  // printed cards with no visible trace of who backed up an instruction.
  test("a set referenceName appears on the card", async () => {
    const items = resolve([pile(1, { referenceName: "Manufacturer care guide" })]);
    const text = (await pageText((await renderPrint(items, MACHINE)).pdf)).join("\n");

    expect(text).toContain("Manufacturer care guide");
  });

  test("an empty referenceName changes nothing", async () => {
    const uncited = resolve([pile(1)]);
    const text = (await pageText((await renderPrint(uncited, MACHINE)).pdf)).join("\n");

    expect(text).not.toContain("—");
    expect(text).not.toContain("Manufacturer care guide");
  });

  test("a referenceLink renders as a reachable PDF link annotation", async () => {
    const items = resolve([
      pile(1, {
        referenceName: "Manufacturer care guide",
        referenceLink: "https://example.com/care-guide",
      }),
    ]);
    const { pdf: bytes } = await renderPrint(items, MACHINE);

    // pdf-lib exposes annotation dicts, but not the /URI action inside one
    // in a typed way worth the code here — the raw stream is unambiguous:
    // a URI PDF action stores the target literally as `(https://…)`.
    const raw = Buffer.from(bytes).toString("latin1");
    expect(raw).toContain("https://example.com/care-guide");
  });

  test("no referenceLink means no link annotation, just the credited name", async () => {
    const items = resolve([pile(1, { referenceName: "Manufacturer care guide" })]);
    const { pdf: bytes } = await renderPrint(items, MACHINE);

    expect(Buffer.from(bytes).toString("latin1")).not.toContain("/Subtype /Link");
  });
});
