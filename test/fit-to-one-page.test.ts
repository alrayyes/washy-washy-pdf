import { describe, expect, test } from "bun:test";
import { PDFDocument } from "pdf-lib";
import { fitToOnePage } from "../src/render";

async function pdfWithPages(count: number): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  for (let i = 0; i < count; i += 1) doc.addPage();
  return doc.save();
}

describe("fitToOnePage", () => {
  test("throws once the growth phase exhausts its step budget without ever fitting", async () => {
    // A render that never comes back as a single page, regardless of the
    // height it's asked for — growAndBisect's growth phase can never
    // succeed, so the search gives up rather than looping forever.
    await expect(fitToOnePage(async () => pdfWithPages(2), 100, 1)).rejects.toThrow(
      "could not fit the content onto one page",
    );
  });

  test("returns the single-page pdf whose height it settled on", async () => {
    const result = await fitToOnePage(async (height) => pdfWithPages(height >= 200 ? 1 : 2), 50, 1);

    expect(await PDFDocument.load(result.pdf).then((d) => d.getPageCount())).toBe(1);
    expect(result.height).toBeGreaterThanOrEqual(200);
  });
});
