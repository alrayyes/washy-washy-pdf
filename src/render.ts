import { pdf } from "@react-pdf/renderer";
import {
  ironGroups,
  ironSettingKeys,
  type Machine,
  type ResolvedInstruction,
  type Variant,
  washGroups,
} from "@washy-washy/core/browser";
import { PDFDocument } from "pdf-lib";
import type { ReactElement } from "react";
import { CardDocument, PhoneDocument, PrintDocument, ReferenceDocument } from "./documents";
import { sanitizeInstructions } from "./sanitize";

async function pageCount(bytes: Uint8Array): Promise<number> {
  return (await PDFDocument.load(bytes)).getPageCount();
}

/**
 * `renderToBuffer` is Node-only — it throws in a browser even from the
 * browser build, since a `Buffer` is a Node type. `pdf(…).toBlob()` is the
 * one render entry point react-pdf exposes on both platforms, so this is
 * what makes `renderPhone`/`renderPrint` usable from `apps/web`'s island as
 * well as the CLI. Every caller here actually passes a <Document> wrapped in
 * <ApplianceContext.Provider>, not a bare Document, which is looser than
 * what react-pdf's own types ask for.
 */
// biome-ignore lint/suspicious/noExplicitAny: see above — matches react-pdf's own loosely typed `document` param
async function renderToBytes(document: ReactElement<any>): Promise<Uint8Array> {
  const blob = await pdf(document).toBlob();
  return new Uint8Array(await blob.arrayBuffer());
}

/**
 * Rough first guess at the phone sheet's height, refined by measurement.
 *
 * Only a starting point for the search below, so it is allowed to be wrong —
 * but a guess that is wrong by a factor costs passes at both ends, and the
 * split sheets carry a fraction of what the full one does.
 */
function guessHeight(items: ResolvedInstruction[], machine: Machine, variant: Variant): number {
  const length = (pick: (item: ResolvedInstruction) => string) =>
    items.reduce((total, item) => total + pick(item).length, 0);

  if (variant === "iron") {
    const cards = ironGroups(items, ironSettingKeys(machine)).length;
    return 200 + cards * 110 + items.length * 12 + length((item) => item.ironingNotes) * 0.35;
  }

  const prose =
    length((item) => item.detergent) + length((item) => item.drying) + length((item) => item.notes);
  if (variant === "wash") return 260 + washGroups(items).length * 190 + prose * 0.35;
  return 260 + items.length * 250 + (prose + length((item) => item.ironingNotes)) * 0.35;
}

export interface PhoneRender {
  pdf: Uint8Array;
  height: number;
  attempts: number;
  /**
   * Distinct characters the chart carried that this package's Helvetica
   * font can't render, transliterated where a faithful equivalent exists
   * and stripped otherwise — see `sanitizeText`. Empty when the chart was
   * already fully WinAnsi-safe, which is the common case.
   */
  dropped: string[];
}

/**
 * Finds the shortest page height a render function still comes back one
 * page at — the trick `renderPhone` and `renderCard` both need: there is no
 * way to ask the layout engine how tall the content came out, so the height
 * is found by rendering. Grow from `initialGuess` until it stops spilling
 * onto a second page, then bisect back down until the trailing blank space
 * is under `tolerance`. Each pass is a few tens of milliseconds.
 */
async function fitToOnePage(
  render: (height: number) => Promise<Uint8Array>,
  initialGuess: number,
  tolerance: number,
): Promise<{ pdf: Uint8Array; height: number; attempts: number }> {
  let attempts = 0;

  const fits = async (height: number) => {
    attempts += 1;
    const pdf = await render(height);
    return { pdf, single: (await pageCount(pdf)) === 1 };
  };

  let tooShort = 0;
  let height = Math.ceil(initialGuess);
  let best: { pdf: Uint8Array; height: number } | null = null;

  for (let step = 0; step < 12 && best === null; step += 1) {
    const { pdf, single } = await fits(height);
    if (single) best = { pdf, height };
    else {
      tooShort = height;
      height = Math.ceil(height * 1.35);
    }
  }
  if (best === null) throw new Error("could not fit the content onto one page");

  let low = tooShort;
  let high = best.height;
  while (high - low > tolerance) {
    const middle = Math.round((low + high) / 2);
    const { pdf, single } = await fits(middle);
    if (single) {
      best = { pdf, height: middle };
      high = middle;
    } else {
      low = middle;
    }
  }

  return { pdf: best.pdf, height: best.height, attempts };
}

/**
 * Renders the phone sheet as a single continuous page.
 *
 * @example
 * ```ts
 * import { renderPhone } from "@washy-washy/pdf";
 * import { resolve } from "@washy-washy/core";
 *
 * const items = resolve(instructions);
 * const { pdf, height, attempts } = await renderPhone(items, machine);
 * ```
 */
export async function renderPhone(
  items: ResolvedInstruction[],
  machine: Machine,
  variant: Variant = "full",
  tolerance = 8,
): Promise<PhoneRender> {
  const { items: clean, dropped } = sanitizeInstructions(items);
  const { pdf, height, attempts } = await fitToOnePage(
    (height) => renderToBytes(PhoneDocument({ items: clean, height, machine, variant })),
    guessHeight(clean, machine, variant),
    tolerance,
  );
  return { pdf, height, attempts, dropped };
}

/**
 * Rough first guess at one card's height, refined by measurement the same
 * way `guessHeight` seeds the phone sheet — a single group rather than a
 * whole chart, so the constant is the fixed chrome (masthead, the
 * disclaimer text) around one card instead of many.
 */
function guessCardHeight(items: ResolvedInstruction[], variant: Variant): number {
  const length = (pick: (item: ResolvedInstruction) => string) =>
    items.reduce((total, item) => total + pick(item).length, 0);

  if (variant === "iron") return 160 + length((item) => item.ironingNotes) * 0.5;

  const prose =
    length((item) => item.detergent) + length((item) => item.drying) + length((item) => item.notes);
  return 190 + (prose + length((item) => item.ironingNotes)) * 0.4;
}

/**
 * Renders one pile's card on its own sheet — the masthead and (unless the
 * cut is ironing-only) the duration disclaimer around it, sized to the card
 * the same way `renderPhone` sizes the whole chart.
 *
 * `items` is one resolved group — usually a single pile, occasionally
 * several sharing identical settings — the same shape `Card`/`IronCard`
 * take internally.
 *
 * @example
 * ```ts
 * import { renderCard } from "@washy-washy/pdf";
 * import { resolve } from "@washy-washy/core";
 *
 * const items = resolve(instructions);
 * const group = items.slice(0, 1); // one pile's group
 * const { pdf, height, attempts } = await renderCard(group, machine);
 * ```
 */
export async function renderCard(
  items: ResolvedInstruction[],
  machine: Machine,
  variant: Variant = "full",
  tolerance = 8,
): Promise<PhoneRender> {
  const { items: clean, dropped } = sanitizeInstructions(items);
  const { pdf, height, attempts } = await fitToOnePage(
    (height) => renderToBytes(CardDocument({ items: clean, height, machine, variant })),
    guessCardHeight(clean, variant),
    tolerance,
  );
  return { pdf, height, attempts, dropped };
}

/**
 * Full size, and as tight as the tables ever get — `documents.tsx`'s
 * `densityFont` floors every text style at `MIN_FONT_SIZE` regardless of how
 * low this goes, so tightening past this point is spent on the grid
 * (`summaryColumns` widths, `labelWidth`), not on shrinking type further.
 */
const LOOSEST = 1;
const TIGHTEST = 0.7;

/**
 * How tightly to set the reference sheet's two tables.
 *
 * Each pile costs them a row each, so a long enough chart runs off the bottom
 * of the A4. Same trick as the phone sheet, in the other direction: the page
 * size is fixed here, so it is the type and the grid that give. Set it full
 * size and measure, then bisect to the loosest setting that still comes back
 * one page — and if even the tightest setting doesn't, accept it and let the
 * sheet flow onto a second page rather than shrinking type past the floor.
 */
async function fittingDensity(
  items: ResolvedInstruction[],
  machine: Machine,
  variant: Variant,
  tolerance = 0.02,
): Promise<number> {
  const fits = async (density: number) => {
    const bytes = await renderToBytes(ReferenceDocument({ items, machine, density, variant }));
    return (await pageCount(bytes)) === 1;
  };

  if (await fits(LOOSEST)) return LOOSEST;
  if (!(await fits(TIGHTEST))) return TIGHTEST;

  let tight = TIGHTEST;
  let loose = LOOSEST;
  while (loose - tight > tolerance) {
    const middle = (loose + tight) / 2;
    if (await fits(middle)) tight = middle;
    else loose = middle;
  }
  return tight;
}

/**
 * Renders the printable A4 sheet: a reference table first, then a detail
 * card per pile.
 *
 * The table and card density is measured the same way `renderPhone` measures
 * height, in the other direction — the page size is fixed, so the type sets
 * tighter until the sheet fits on one page.
 *
 * @example
 * ```ts
 * import { renderPrint } from "@washy-washy/pdf";
 * import { resolve } from "@washy-washy/core";
 *
 * const items = resolve(instructions);
 * const { pdf, dropped } = await renderPrint(items, machine);
 * ```
 */
export async function renderPrint(
  items: ResolvedInstruction[],
  machine: Machine,
  variant: Variant = "full",
): Promise<{ pdf: Uint8Array; dropped: string[] }> {
  const { items: clean, dropped } = sanitizeInstructions(items);
  const pdf = await renderToBytes(
    PrintDocument({
      items: clean,
      machine,
      variant,
      density: await fittingDensity(clean, machine, variant),
    }),
  );
  return { pdf, dropped };
}
