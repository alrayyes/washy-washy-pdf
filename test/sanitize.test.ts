import { describe, expect, test } from "bun:test";
import { resolve } from "@washy-washy/core/browser";
import { renderPhone, renderPrint } from "../src/render";
import { sanitizeInstructions, sanitizeText } from "../src/sanitize";
import { MACHINE, pile } from "./fixtures";
import { pageText } from "./pdf-text";

// #16: only the standard Helvetica set is used, and a character outside it
// used to just vanish from the rendered PDF — no warning, no trace. Curly
// quotes, ≈ and ✓ are named in the audit that found this.
describe("sanitizeText", () => {
  test("transliterates curly quotes, ellipsis, ≈ and ✓ to WinAnsi-safe equivalents", () => {
    expect(sanitizeText("‘quoted’").text).toBe("'quoted'");
    expect(sanitizeText("“quoted”").text).toBe('"quoted"');
    expect(sanitizeText("wait…").text).toBe("wait...");
    expect(sanitizeText("≈40°").text).toBe("~40°");
    expect(sanitizeText("done ✓").text).toBe("done v");
  });

  test("none of the transliterated characters are reported as dropped", () => {
    const { dropped } = sanitizeText("‘’“”…≈✓");
    expect(dropped).toEqual([]);
  });

  test("a character with no reasonable mapping is stripped and reported", () => {
    const result = sanitizeText("shirt \u{1F600}"); // 😀, an emoji
    expect(result.text).toBe("shirt ");
    expect(result.dropped).toEqual(["\u{1F600}"]);
  });

  test("plain ASCII and the confirmed-safe glyphs pass through unchanged", () => {
    // ·, °, ~ (already used across the layout) and — / – (CONTRIBUTING.md's
    // own "these are fine" list) round-trip byte-identical.
    const safe = "Cottons 40° · 1200 rpm ~2:15 — a note – another";
    expect(sanitizeText(safe)).toEqual({ text: safe, dropped: [] });
  });
});

describe("sanitizeInstructions", () => {
  test("cleans every text field and collects distinct dropped characters once", () => {
    const items = resolve([
      pile(1, { clothingType: "Café shirt \u{1F600}", notes: "‘note’ \u{1F600}" }),
    ]);
    const { items: clean, dropped } = sanitizeInstructions(items);

    expect(clean[0]?.clothingType).toBe("Café shirt ");
    expect(clean[0]?.notes).toBe("'note' ");
    expect(dropped).toEqual(["\u{1F600}"]);
  });
});

describe("render functions report what they dropped", () => {
  test("renderPhone reports dropped characters and keeps the transliteration", async () => {
    const items = resolve([pile(1, { notes: "‘pinned’ \u{1F600}" })]);
    const result = await renderPhone(items, MACHINE);

    expect(result.dropped).toEqual(["\u{1F600}"]);
    const text = (await pageText(result.pdf)).join("\n");
    expect(text).toContain("'pinned'");
  });

  test("renderPrint reports dropped characters alongside the pdf", async () => {
    const items = resolve([pile(1, { notes: "\u{1F600}" })]);
    const result = await renderPrint(items, MACHINE);

    expect(result.dropped).toEqual(["\u{1F600}"]);
    expect(result.pdf.length).toBeGreaterThan(0);
  });

  test("a fully WinAnsi-safe chart reports nothing dropped", async () => {
    const items = resolve([pile(1)]);
    const result = await renderPhone(items, MACHINE);

    expect(result.dropped).toEqual([]);
  });
});
