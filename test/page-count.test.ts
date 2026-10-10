import { describe, expect, test } from "bun:test";
import { resolve } from "@washy-washy/core/browser";
import { PDFDocument } from "pdf-lib";
import { countPages } from "../src/page-count";
import { renderPhone, renderPrint } from "../src/render";
import { MACHINE, pile } from "./fixtures";

// The fitting loop only needs to know "one page or more", and it asks dozens
// of times per export. pdf-lib answered it, at 183 KB gzipped in the browser
// bundle. This reads the page objects react-pdf writes instead, with pdf-lib
// kept here as the oracle that it agrees.
async function oracle(bytes: Uint8Array): Promise<number> {
  return (await PDFDocument.load(bytes)).getPageCount();
}

describe("countPages", () => {
  test("counts one page for a phone sheet, which is fitted to exactly one", async () => {
    const { pdf } = await renderPhone(resolve([pile(1)]), MACHINE);

    expect(countPages(pdf)).toBe(1);
    expect(countPages(pdf)).toBe(await oracle(pdf));
  });

  test("agrees with pdf-lib on a chart that flows onto several pages", async () => {
    const items = resolve(Array.from({ length: 40 }, (_, i) => pile(i + 1)));
    const { pdf } = await renderPrint(items, MACHINE);

    expect(await oracle(pdf)).toBeGreaterThan(1);
    expect(countPages(pdf)).toBe(await oracle(pdf));
  });

  test("does not count the /Pages tree node as a page", () => {
    const bytes = new TextEncoder().encode(
      "1 0 obj\n<< /Type /Pages /Count 2 /Kids [2 0 R 3 0 R] >>\nendobj\n" +
        "2 0 obj\n<< /Type /Page /Parent 1 0 R >>\nendobj\n" +
        "3 0 obj\n<< /Type/Page /Parent 1 0 R >>\nendobj\n",
    );

    expect(countPages(bytes)).toBe(2);
  });
});
