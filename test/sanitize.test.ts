import { describe, expect, test } from "bun:test";
import type { Machine } from "@washy-washy/core/browser";
import { resolve } from "@washy-washy/core/browser";
import { renderPhone, renderPrint } from "../src/render";
import { sanitizeInstructions, sanitizeMachine, sanitizeText } from "../src/sanitize";
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

  // #49: ReferenceCredit (added by #30) reads referenceName/referenceLink
  // straight off the item, but this function never cleaned either — a
  // citation with a curly quote or an emoji would reach the PDF un-
  // transliterated instead of being handled like every other field.
  test("also cleans referenceName and referenceLink", () => {
    const items = resolve([
      pile(1, {
        referenceName: "‘Manufacturer’ guide \u{1F600}",
        referenceLink: "https://example.com/care-guide",
      }),
    ]);
    const { items: clean, dropped } = sanitizeInstructions(items);

    expect(clean[0]?.referenceName).toBe("'Manufacturer' guide ");
    expect(clean[0]?.referenceLink).toBe("https://example.com/care-guide");
    expect(dropped).toEqual(["\u{1F600}"]);
  });
});

// #64: washer/iron labels reached react-pdf raw — an unsupported character
// came out as mojibake instead of being transliterated or reported the way
// every instruction field already was.
describe("sanitizeMachine", () => {
  const dirtyMachine: Machine = {
    washer: {
      name: "Café 1400",
      capacity: "8 kg ✓",
      programs: ["Cottons", "Delicates \u{1F600}"],
      temperatures: ["cold", "40°"],
      spins: ["800", "1200"],
      options: ["Eco…"],
    },
    iron: {
      name: "Steam iron",
      settings: [
        { key: "1", dots: "•", label: "Low", detail: "‘Synthetics’ \u{1F600}", steam: false },
      ],
    },
  };

  test("cleans every washer and iron label and collects distinct dropped characters once", () => {
    const { machine: clean, dropped } = sanitizeMachine(dirtyMachine);

    expect(clean.washer.capacity).toBe("8 kg v");
    expect(clean.washer.programs).toEqual(["Cottons", "Delicates "]);
    expect(clean.washer.options).toEqual(["Eco..."]);
    expect(clean.iron.settings[0]?.detail).toBe("'Synthetics' ");
    expect(dropped).toEqual(["\u{1F600}"]);
  });

  test("does not touch a setting's key — it's an internal lookup id, never drawn as text", () => {
    const withMappableKey: Machine = {
      ...dirtyMachine,
      iron: {
        ...dirtyMachine.iron,
        settings: [{ key: "✓", dots: "•", label: "Low", detail: "Synthetics", steam: false }],
      },
    };
    expect(sanitizeMachine(withMappableKey).machine.iron.settings[0]?.key).toBe("✓");
  });

  test("a fully WinAnsi-safe machine round-trips unchanged with nothing dropped", () => {
    const { machine: clean, dropped } = sanitizeMachine(MACHINE);
    expect(clean).toEqual(MACHINE);
    expect(dropped).toEqual([]);
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
