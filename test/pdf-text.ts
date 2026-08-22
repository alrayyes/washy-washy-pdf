import { decodePDFRawStream, PDFDocument, PDFName, PDFRawStream } from "pdf-lib";

/** How many bytes of drawing instructions each page carries. */
export async function inkPerPage(bytes: Uint8Array): Promise<number[]> {
  const pdf = await PDFDocument.load(bytes);
  return pdf.getPages().map((page) => {
    const contents = page.node.get(PDFName.of("Contents"));
    const stream = contents ? pdf.context.lookup(contents) : undefined;
    return stream instanceof PDFRawStream ? stream.contents.length : 0;
  });
}

/**
 * Reads the drawn text back out of a rendered PDF, page by page.
 *
 * @react-pdf/renderer emits WinAnsi text as hex glyph runs inside `[...] TJ`
 * arrays — `[<54> 60 <657374>] TJ` is "Test", split wherever kerning needs a
 * number between runs. Concatenating every `<hex>` run in a `TJ` array in
 * order reconstructs the literal string, spaces included (a space is just
 * its own `<20>` run). This is a content-stream scrape, not a font-aware
 * text layer, so it only ever has to answer "does this text appear
 * somewhere on the page" — exactly what these tests need.
 */
export async function pageText(bytes: Uint8Array): Promise<string[]> {
  const pdf = await PDFDocument.load(bytes);
  return pdf.getPages().map((page) => {
    const contents = page.node.get(PDFName.of("Contents"));
    const stream = contents ? pdf.context.lookup(contents) : undefined;
    if (!(stream instanceof PDFRawStream)) return "";
    const decoded = Buffer.from(decodePDFRawStream(stream).decode()).toString("latin1");

    let text = "";
    for (const tj of decoded.matchAll(/\[((?:<[0-9a-fA-F]+>\s*-?\d*\s*)+)\]\s*TJ/g)) {
      const run = tj[1] ?? "";
      for (const hex of run.matchAll(/<([0-9a-fA-F]+)>/g)) {
        text += Buffer.from(hex[1] ?? "", "hex").toString("latin1");
      }
    }
    return text;
  });
}
