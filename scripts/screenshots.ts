/**
 * Re-shoots the PNGs the README shows, from the PDFs `bun run examples`
 * writes into `docs/`.
 *
 * The PDFs have no staleness guard of their own — `bun run examples`
 * overwrites them in place, and committing that diff is what keeps them
 * current. The screenshots do: `washy-washy-cli` shipped this same setup
 * without one and the PNGs drifted for three days across three releases
 * before anyone noticed, so `test/screenshots.test.ts` checks each shot's
 * recorded hash against the PDF page it was taken from. That needs nothing
 * extra installed and fails exactly when someone regenerates the PDFs and
 * forgets this.
 *
 * ImageMagick is deliberately not involved. `pdftoppm` crops on its own with
 * -x/-y/-W/-H, and one dependency is better than two.
 */
import { PDFDocument, PDFName, PDFRawStream } from "pdf-lib";

export const DOCS = "docs";
export const MANIFEST = `${DOCS}/screenshots.json`;

export interface Shot {
  /** The PNG under `docs/`, as the README names it. */
  png: string;
  /** The PDF it comes out of, under `docs/`. */
  pdf: string;
  /** 1-based, the way pdftoppm counts. */
  page: number;
  dpi: number;
  /**
   * Pixels to keep from the top left, for a page too long to show whole. The
   * phone sheet is one continuous page well over a thousand points tall; the
   * top of it is the part worth a picture.
   */
  crop?: { width: number; height: number };
}

/**
 * 150 dpi over the 244 pt phone page (`PHONE_WIDTH`, `src/documents.tsx`)
 * gives 509 px, and 110 dpi over an A4 gives 910×1287. Those are the widths
 * the README's `width=` attributes are set against, so changing a dpi here
 * means changing them there.
 */
export const SHOTS: Shot[] = [
  { png: "phone.png", pdf: "phone.pdf", page: 1, dpi: 150, crop: { width: 509, height: 1500 } },
  {
    png: "phone-wash.png",
    pdf: "phone-wash.pdf",
    page: 1,
    dpi: 150,
    crop: { width: 509, height: 1500 },
  },
  {
    png: "phone-iron.png",
    pdf: "phone-iron.pdf",
    page: 1,
    dpi: 150,
    crop: { width: 509, height: 1500 },
  },
  { png: "print.png", pdf: "print.pdf", page: 1, dpi: 110 },
  { png: "print-wash.png", pdf: "print-wash.pdf", page: 1, dpi: 110 },
  { png: "print-iron.png", pdf: "print-iron.pdf", page: 1, dpi: 110 },
  // The second page of the full print set, where the cards are — dials,
  // chips, the iron ring — the part of the drawing a reference table alone
  // doesn't show.
  { png: "print-card.png", pdf: "print.pdf", page: 2, dpi: 110 },
];

/**
 * A hash of what one page of a PDF actually draws.
 *
 * The content stream rather than the file's bytes: two runs over the same
 * input number their streams differently, so a byte comparison would fail on
 * every regeneration regardless of whether the drawing changed.
 */
export async function pageInk(pdf: Uint8Array, page: number): Promise<string> {
  const doc = await PDFDocument.load(pdf);
  const target = doc.getPages()[page - 1];
  if (!target) throw new Error(`page ${page} does not exist — the PDF has ${doc.getPageCount()}`);
  const stream = doc.context.lookup(target.node.get(PDFName.of("Contents")));
  if (!(stream instanceof PDFRawStream)) throw new Error(`page ${page} draws nothing`);
  return Bun.hash(stream.contents).toString(16);
}

/** What the committed screenshots were taken from, keyed by PNG name. */
export type Manifest = Record<string, string>;

export async function inkOf(shot: Shot): Promise<string> {
  return pageInk(await Bun.file(`${DOCS}/${shot.pdf}`).bytes(), shot.page);
}

/** The PNG's own dimensions, read straight out of the IHDR chunk. */
export function pngSize(bytes: Uint8Array): { width: number; height: number } {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return { width: view.getUint32(16), height: view.getUint32(20) };
}

async function shoot(shot: Shot): Promise<void> {
  const out = `${DOCS}/${shot.png}`;
  const crop = shot.crop
    ? ["-x", "0", "-y", "0", "-W", `${shot.crop.width}`, "-H", `${shot.crop.height}`]
    : [];

  const result = Bun.spawnSync({
    cmd: [
      "pdftoppm",
      "-png",
      "-r",
      `${shot.dpi}`,
      "-f",
      `${shot.page}`,
      "-l",
      `${shot.page}`,
      "-singlefile",
      ...crop,
      `${DOCS}/${shot.pdf}`,
      // pdftoppm appends the extension itself.
      out.replace(/\.png$/, ""),
    ],
    stdout: "pipe",
    stderr: "pipe",
  });

  if (result.exitCode !== 0) {
    throw new Error(`pdftoppm failed on ${shot.png}: ${result.stderr.toString().trim()}`);
  }
}

if (import.meta.main) {
  if (Bun.which("pdftoppm") === null) {
    console.error(
      "pdftoppm is not installed. It comes with poppler:\n" +
        "  Arch    sudo pacman -S poppler\n" +
        "  Debian  sudo apt install poppler-utils\n" +
        "  macOS   brew install poppler",
    );
    process.exit(1);
  }

  const manifest: Manifest = {};
  for (const shot of SHOTS) {
    await shoot(shot);
    manifest[shot.png] = await inkOf(shot);
    const size = pngSize(await Bun.file(`${DOCS}/${shot.png}`).bytes());
    console.log(
      `  ${DOCS}/${shot.png}  ${size.width}x${size.height}  from ${shot.pdf} p${shot.page}`,
    );
  }

  await Bun.write(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`\nwrote ${MANIFEST}`);
}
