import { describe, expect, test } from "bun:test";
import { resolve } from "@washy-washy/core/browser";
import { PDFDocument } from "pdf-lib";
import { renderPrint } from "../src/render";
import { MACHINE, pile } from "./fixtures";
import { pageText } from "./pdf-text";

// #13: PrintDocument flowed cards onto however many A4 pages the chart
// needed with no page numbers and no running header, and its metadata was
// title/author only — nothing named the cut or what generated the file.
describe("PrintDocument metadata", () => {
  test("Title, Author, Subject and Creator are all populated", async () => {
    const items = resolve([pile(1)]);
    const bytes = await renderPrint(items, MACHINE);
    const doc = await PDFDocument.load(bytes);

    expect(doc.getTitle()).toBeTruthy();
    expect(doc.getAuthor()).toBeTruthy();
    expect(doc.getCreator()).toBeTruthy();
    const subject = doc.getSubject();
    expect(subject).toContain(MACHINE.washer.name);
    expect(subject).toContain("Washing instructions");
  });

  test("declares a document language", async () => {
    const items = resolve([pile(1)]);
    const bytes = await renderPrint(items, MACHINE);
    // pdf-lib has no getLanguage() — the catalog's /Lang entry is read
    // straight off the raw bytes instead.
    const raw = Buffer.from(bytes).toString("latin1");

    expect(raw).toMatch(/\/Lang\s*\([a-zA-Z-]+\)/);
  });
});

describe("PrintDocument running header and page mark", () => {
  test("a later page carries the sheet's title, cut and machine name", async () => {
    // 24 piles reliably spans more than one card page.
    const items = resolve(Array.from({ length: 24 }, (_, index) => pile(index + 1)));
    const pages = await pageText(await renderPrint(items, MACHINE));

    expect(pages.length).toBeGreaterThan(1);
    const lastPage = pages.at(-1) ?? "";
    expect(lastPage).toContain("Washing instructions");
    expect(lastPage).toContain(MACHINE.washer.name);
  });

  test("every page after the first carries a page N of M mark", async () => {
    const items = resolve(Array.from({ length: 24 }, (_, index) => pile(index + 1)));
    const pages = await pageText(await renderPrint(items, MACHINE));

    expect(pages.length).toBeGreaterThan(1);
    for (const page of pages.slice(1)) {
      expect(page).toMatch(new RegExp(`Page \\d+ of ${pages.length}`));
    }
  });
});
