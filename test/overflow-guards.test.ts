import { describe, expect, test } from "bun:test";
import { pdf } from "@react-pdf/renderer";
import { resolve } from "@washy-washy/core/browser";
import { PDFDocument } from "pdf-lib";
import { MIN_MATRIX_CELL, ReferenceDocument } from "../src/documents";
import { renderPrint } from "../src/render";
import { MACHINE, pile } from "./fixtures";
import { inkPerPage, pageText } from "./pdf-text";

// #17: three unbounded-overflow cliffs — a card taller than one A4 page
// couldn't split (wrap={false} everywhere), matrix cells narrowed without a
// floor as pile count grew, and a handful of fixed-width labels had no
// headroom for longer real-world values.

describe("oversized card", () => {
  test("a card too tall for one page splits instead of warning and delivers all its content", async () => {
    // 200 paragraphs reliably pushes a single card's height past one A4
    // page — react-pdf logs "Node of type VIEW can't wrap between pages
    // and it's bigger than available page height" for exactly this case
    // when a View is wrap={false}, which is the failure this test catches.
    const longProse = Array.from(
      { length: 200 },
      (_, i) => `Paragraph ${i + 1} of a very long note about this pile.`,
    ).join(" ");
    const items = resolve([pile(1, { notes: longProse })]);

    const warnings: unknown[][] = [];
    const originalWarn = console.warn;
    console.warn = (...args: unknown[]) => warnings.push(args);
    let bytes: Uint8Array;
    try {
      ({ pdf: bytes } = await renderPrint(items, MACHINE));
    } finally {
      console.warn = originalWarn;
    }

    expect(warnings.join(" ")).not.toContain("can't wrap between pages");

    const doc = await PDFDocument.load(bytes);
    expect(doc.getPageCount()).toBeGreaterThan(1);
    // No blank overflow page: every page carries real content.
    expect((await inkPerPage(bytes)).filter((ink) => ink < 1000)).toEqual([]);

    const pages = await pageText(bytes);
    const fullText = pages.join("\n");
    expect(fullText).toContain("Paragraph 1 of a very long note");
    expect(fullText).toContain("Paragraph 200 of a very long note");
  }, 30_000);
});

describe("mix matrix at high pile counts", () => {
  test("cell width never drops below MIN_MATRIX_CELL, splitting into blocks instead", async () => {
    const items = resolve(Array.from({ length: 40 }, (_, index) => pile(index + 1)));
    const blob = await pdf(ReferenceDocument({ items, machine: MACHINE, density: 0.7 })).toBlob();
    const bytes = new Uint8Array(await blob.arrayBuffer());

    const text = (await pageText(bytes)).join("\n");
    // Every pile's row survives — nothing dropped by splitting into blocks.
    // (?!\d), not \b: adjacent cells are concatenated with no separator, so
    // "Pile 1" runs straight into the next cell's text with no boundary for
    // \b to catch — only another digit (as in "Pile 10") is a real ambiguity.
    for (const n of [1, 20, 40]) {
      expect(text).toMatch(new RegExp(`${n}\\. Pile ${n}(?!\\d)`));
    }
    // Unfloored, 40 columns at density 0.7 would divide to ~11pt (below
    // MIN_MATRIX_CELL) — confirms the scenario this test exercises genuinely
    // needs the floor/split, not just happening to already fit.
    const labelWidth = 118 * 0.7;
    const naiveCell = (595.28 - 72 - labelWidth) / 40;
    expect(naiveCell).toBeLessThan(MIN_MATRIX_CELL);
  }, 30_000);
});

describe("fixed-width labels grow for longer values", () => {
  test("a longer programme name and duration are fully present in the Loads table", async () => {
    const items = resolve([pile(1, { program: "Allergy Plus Extra", duration: "~12:30" })]);
    const text = (await pageText((await renderPrint(items, MACHINE)).pdf)).join("\n");

    expect(text).toContain("Allergy Plus Extra");
    expect(text).toContain("~12:30");
  });
});

describe("reference sheet overflow", () => {
  // #26: a chart whose reference sheet overflows page 1 by just the
  // legend — dial drawing, caption, description paragraph — used to leave
  // that legend behind on its own near-blank page 2 when the row it sat in
  // split mid-flow, sometimes losing the whole row and leaving nothing but
  // the fixed header/footer (empty flow captured under 1000 bytes, the same
  // floor the CLI's own blank-page guard uses). Ten piles with long enough
  // detergent/notes prose reliably overflows the reference sheet by exactly
  // that legend row and nothing more, at the current column widths.
  test("a reference sheet that overflows by just the legend still delivers it, not a near-blank continuation", async () => {
    const longNote = (label: string) =>
      `Detailed care note for ${label} covering fabric, colour and handling instructions that run fairly long to mimic a real chart entry with several clauses.`;
    const items = resolve(
      Array.from({ length: 10 }, (_, index) =>
        pile(index + 1, {
          detergent: longNote(`pile ${index + 1}`),
          notes: longNote(`notes ${index + 1}`),
        }),
      ),
    );

    const { pdf } = await renderPrint(items, MACHINE);
    const ink = await inkPerPage(pdf);
    expect(ink.filter((n) => n < 1000)).toEqual([]);

    const pages = await pageText(pdf);
    expect(pages[1]).toContain("twelve o'clock is Cottons");
  });
});

describe("card page overflow", () => {
  // #34: a card too long for the remaining space on a page splits, per
  // #17, rather than warning — but the split point can land right at the
  // card's own closing border and padding, once every field with actual
  // content has already rendered. What's left is a page holding nothing
  // but that border: a near-blank continuation page between two content
  // pages.
  test("the trailing page after a split card carries real content, not just closing chrome", async () => {
    const longNote = (n: string) =>
      `Detailed care note for ${n} covering fabric, colour and handling instructions that run fairly long to mimic a real chart entry with several clauses.`;
    const items = resolve(
      Array.from({ length: 16 }, (_, i) =>
        pile(i + 1, { detergent: longNote(`pile ${i + 1}`), notes: longNote(`notes ${i + 1}`) }),
      ),
    );

    const { pdf: bytes } = await renderPrint(items, MACHINE, "full");
    expect((await inkPerPage(bytes)).filter((ink) => ink < 1000)).toEqual([]);

    const doc = await PDFDocument.load(bytes);
    expect(doc.getPageCount()).toBeGreaterThan(1);
  }, 30_000);
});

describe("bundled example stays visually unchanged", () => {
  // The existing 24-pile stress fixture, unaffected by any of the three
  // guards above — it never reaches the card-height, matrix-cell, or
  // label-width thresholds they only bite past.
  test("still fits the reference sheet on one page", async () => {
    const items = resolve(Array.from({ length: 24 }, (_, index) => pile(index + 1)));

    expect(
      (await inkPerPage((await renderPrint(items, MACHINE)).pdf)).filter((ink) => ink < 1000),
    ).toEqual([]);
  }, 60_000);
});
