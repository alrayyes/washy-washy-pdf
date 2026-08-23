import { describe, expect, test } from "bun:test";
import { resolve } from "@washy-washy/core/browser";
import { PDFDocument } from "pdf-lib";
import { renderCard } from "../src/render";
import { MACHINE, pile } from "./fixtures";
import { pageText } from "./pdf-text";

// #14: there was no single-pile document. The web app's per-card download
// called renderPhone with a one-group slice, wrapping the full phone-sheet
// chrome (loads table, legend) around one card — and tripped react-pdf's
// "Node of type VIEW can't wrap between pages" warning doing it.
describe("renderCard", () => {
  test("contains the card and no loads table or legend", async () => {
    const group = resolve([pile(1)]);
    const result = await renderCard(group, MACHINE);
    const text = (await pageText(result.pdf)).join("\n");

    expect(text).toContain("Pile 1");
    expect(text).toContain(MACHINE.washer.name);
    expect(text).not.toContain("LOADS");
    // "programme" (lowercase, standalone) is Legend's dial caption and
    // appears nowhere else — a longer phrase risks a false negative from
    // react-pdf's own hyphenation ("ma-chine" mid-word at a line wrap).
    expect(text).not.toContain("programme");
  });

  test("renders one page with no react-pdf wrap warning", async () => {
    const group = resolve([pile(1)]);

    const warnings: unknown[][] = [];
    const originalWarn = console.warn;
    console.warn = (...args: unknown[]) => warnings.push(args);
    let result: Awaited<ReturnType<typeof renderCard>>;
    try {
      result = await renderCard(group, MACHINE);
    } finally {
      console.warn = originalWarn;
    }

    expect(warnings.join(" ")).not.toContain("can't wrap between pages");
    const doc = await PDFDocument.load(result.pdf);
    expect(doc.getPageCount()).toBe(1);
  });

  test("the iron variant drops the duration disclaimer, the full/wash variants keep it", async () => {
    const group = resolve([pile(1)]);

    const full = await renderCard(group, MACHINE, "full");
    expect((await pageText(full.pdf)).join("\n")).toContain("Durations are");

    const iron = await renderCard(group, MACHINE, "iron");
    expect((await pageText(iron.pdf)).join("\n")).not.toContain("Durations are");
  });

  test("transliterates and reports non-WinAnsi characters, same as renderPhone", async () => {
    const group = resolve([pile(1, { notes: "Approx “done” ✓" })]);
    const result = await renderCard(group, MACHINE);

    expect(result.dropped).toEqual([]);
    const text = (await pageText(result.pdf)).join("\n");
    expect(text).toContain('"done" v');
  });
});
