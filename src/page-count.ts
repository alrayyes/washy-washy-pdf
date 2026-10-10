/**
 * Counts the pages in a PDF that react-pdf wrote.
 *
 * The fitting loop only needs "one page, or more?", and asks dozens of times
 * per export. Loading the file with a full PDF library to answer that cost
 * 183 KB gzipped in the browser bundle.
 *
 * Every page is a dictionary with `/Type /Page`, and pdfkit writes those
 * uncompressed and outside object streams, so counting them is enough. The
 * look-ahead keeps the `/Pages` tree node from counting. This is not a
 * general PDF reader: a file that packs its page dictionaries into object
 * streams, as pdf-lib's `save()` does by default, would count as zero.
 */
export function countPages(bytes: Uint8Array): number {
  const text = new TextDecoder("latin1").decode(bytes);
  return text.match(/\/Type\s*\/Page(?![A-Za-z])/g)?.length ?? 0;
}
