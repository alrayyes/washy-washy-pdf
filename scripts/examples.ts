#!/usr/bin/env bun
/**
 * Redraws the six PDFs the README links, from the example chart in
 * `example-chart.ts`. `bun run screenshots` re-shoots the PNGs from these
 * afterwards — the two are separate steps because rasterising needs poppler,
 * which is a system package rather than a bun one.
 */
import { resolve, type Variant, variants } from "@washy-washy/core/browser";
import { renderPhone, renderPrint } from "../src/render";
import { CHART, MACHINE } from "./example-chart";

const DOCS = "docs";

function suffix(variant: Variant): string {
  return variant === "full" ? "" : `-${variant}`;
}

async function main() {
  const items = resolve(CHART);

  for (const variant of variants) {
    const { pdf: phone } = await renderPhone(items, MACHINE, variant);
    await Bun.write(`${DOCS}/phone${suffix(variant)}.pdf`, phone);

    const { pdf: print } = await renderPrint(items, MACHINE, variant);
    await Bun.write(`${DOCS}/print${suffix(variant)}.pdf`, print);

    console.log(`  wrote phone${suffix(variant)}.pdf and print${suffix(variant)}.pdf`);
  }
}

if (import.meta.main) await main();
