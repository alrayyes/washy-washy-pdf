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

describe("Card wash/iron section order", () => {
  // #32: the card printed dial/chips, Detergent, Iron, Drying, then "Wash
  // together with" last — splitting the wash-phase fields apart with the
  // iron section in the middle, and burying "Wash together with" after
  // Drying instead of grouping it with the rest of the wash phase. GINETEX
  // orders care information Washing before Ironing; washy-washy-web hit
  // and fixed the identical defect in its own card component (#83/#84).
  test("groups the wash-phase fields together, unbroken, with iron last before Notes", async () => {
    const items = resolve([pile(1, { notes: "Check the label first." })]);
    const pages = await pageText((await renderPrint(items, MACHINE)).pdf);
    // The reference table's own "Iron" column, on an earlier page, would
    // otherwise be the first hit for "IRON" — the card itself is the page
    // carrying "DETERGENT", which only the card prints.
    const cardText = pages.find((page) => page.includes("DETERGENT"));
    if (cardText === undefined) throw new Error("no card page found");

    const order = ["WASH", "DETERGENT", "WASH TOGETHER WITH", "DRYING", "IRON", "NOTES"].map(
      (label) => cardText.indexOf(label),
    );
    expect(order.every((position) => position !== -1)).toBe(true);
    expect(order).toEqual([...order].sort((a, b) => a - b));
  });

  test("a washing-only card has a Wash heading and no Iron section", async () => {
    const items = resolve([pile(1)]);
    const pages = await pageText((await renderPrint(items, MACHINE, "wash")).pdf);
    const cardText = pages.find((page) => page.includes("DETERGENT"));
    if (cardText === undefined) throw new Error("no card page found");

    expect(cardText).toContain("WASH");
    expect(cardText).not.toContain("IRON");
  });
});
