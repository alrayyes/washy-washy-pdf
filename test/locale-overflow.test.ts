import { describe, expect, test } from "bun:test";
import { resolve } from "@washy-washy/core/browser";
import { renderCard, renderPhone, renderPrint } from "../src/render";
import { sanitizeText } from "../src/sanitize";
import { AR_MACHINE, arPile, ZH_MACHINE, zhPile } from "./locale-fixtures";
import { inkPerPage } from "./pdf-text";

// #59: the rest of this suite only ever exercises English placeholder text
// from `fixtures.ts`. Real translated content is shaped differently — `ar`
// is right-to-left, `zh` has no natural word-break spacing — and either
// could in principle expose a text-measurement/wrapping assumption English
// never would. It turns out this package's Helvetica font can't render
// either script at all (WinAnsi-only, see CONTRIBUTING.md and
// `sanitize.ts`), so `sanitizeInstructions` strips almost all of the
// translated prose down to punctuation and digits before it ever reaches
// react-pdf — there is no rendered Arabic/Chinese glyph to assert is
// present. What these tests can honestly check, and do, is that the
// overflow guards still hold once real translated content collapses down
// through that stripping, and that nothing is dropped *silently* — every
// removed character still comes back in `dropped`. (The `Machine`'s own
// washer/iron labels go through a separate `sanitizeMachine` pass, covered
// below and in sanitize.test.ts — see #64.)
describe.each([
  ["ar", AR_MACHINE, arPile],
  ["zh", ZH_MACHINE, zhPile],
] as const)("%s real locale data", (_locale, machine, pile) => {
  test.each([24, 40])(
    "renderPrint stays clear of the near-blank floor at %d piles",
    async (count) => {
      const items = resolve(Array.from({ length: count }, (_, i) => pile(i + 1)));

      const warnings: unknown[][] = [];
      const originalWarn = console.warn;
      console.warn = (...args: unknown[]) => warnings.push(args);
      let bytes: Uint8Array;
      try {
        ({ pdf: bytes } = await renderPrint(items, machine));
      } finally {
        console.warn = originalWarn;
      }

      expect(warnings.join(" ")).not.toContain("can't wrap between pages");
      expect((await inkPerPage(bytes)).filter((ink) => ink < 1000)).toEqual([]);
    },
    30_000,
  );

  test("renderPhone and renderCard also stay clear of the near-blank floor", async () => {
    const items = resolve(Array.from({ length: 24 }, (_, i) => pile(i + 1)));

    const { pdf: phonePdf } = await renderPhone(items, machine, "wash");
    expect((await inkPerPage(phonePdf)).filter((ink) => ink < 1000)).toEqual([]);

    const { pdf: cardPdf } = await renderCard(items, machine, "full");
    expect((await inkPerPage(cardPdf)).filter((ink) => ink < 1000)).toEqual([]);
  }, 30_000);

  test("every non-WinAnsi character removed is reported in `dropped`, not silently lost", async () => {
    const items = resolve(Array.from({ length: 24 }, (_, i) => pile(i + 1)));
    const { dropped } = await renderPrint(items, machine);

    expect(dropped.length).toBeGreaterThan(0);
    // Every distinct non-ASCII character the fixture's programmes carry
    // (beyond WinAnsi/Latin-1, which `sanitizeText` already tolerates) shows
    // up in `dropped` — nothing vanishes without being accounted for.
    const nonWinAnsiChars = new Set(
      machine.washer.programs
        .join("")
        .split("")
        .filter((char) => {
          const code = char.codePointAt(0) ?? 0;
          return code > 0xff;
        }),
    );
    for (const char of nonWinAnsiChars) {
      expect(dropped).toContain(char);
    }
  });

  // #64: washer.capacity and iron.name are never echoed into any instruction
  // field by `localePile` (only programs/temperatures/spins/options/iron
  // detail/key are), so the only way their characters can reach `dropped`
  // is if the machine object itself is sanitized before reaching react-pdf
  // — before the fix, these came out as silent mojibake instead.
  test("machine-only fields (capacity, iron name) also report their dropped characters", async () => {
    const items = resolve(Array.from({ length: 4 }, (_, i) => pile(i + 1)));
    const { dropped } = await renderPrint(items, machine);

    const machineOnlyChars = new Set(
      `${machine.washer.capacity}${machine.iron.name}`
        .split("")
        .filter((char) => sanitizeText(char).dropped.length > 0),
    );
    expect(machineOnlyChars.size).toBeGreaterThan(0);
    for (const char of machineOnlyChars) {
      expect(dropped).toContain(char);
    }
  });
});
