import { describe, expect, test } from "bun:test";
import { pdf } from "@react-pdf/renderer";
import {
  type ResolvedInstruction,
  resolve,
  type Variant,
  variants,
} from "@washy-washy/core/browser";
import { PDFDocument } from "pdf-lib";
import { pageInk } from "../scripts/screenshots";
import {
  CardDocument,
  cardChrome,
  gist,
  ironCardKey,
  ironLabel,
  legendExample,
  legendHottestSetting,
  MIN_MATRIX_CELL,
  matrixLayout,
  PhoneDocument,
  protectsReferenceCredit,
  sheetGroups,
  steamColumnValue,
  summaryColumns,
  TABLE_WIDTH_BUDGET,
  washTogetherText,
} from "../src/documents";
import { renderCard, renderPhone, renderPrint } from "../src/render";
import { MACHINE, pile } from "./fixtures";
import { inkPerPage, pageText } from "./pdf-text";

/** Same gutter `SummaryTable` gives the row-number column. */
const ROW_NUMBER_GUTTER = 14;

describe("ironLabel", () => {
  test("reads 'do not iron' for a never-ironed pile, whatever its ironSetting", () => {
    const item = resolve([pile(1, { ironing: false, ironSetting: "2" })])[0] as ResolvedInstruction;
    expect(ironLabel(MACHINE, item)).toBe("do not iron");
  });

  test("reads the machine's own label for a known ironSetting", () => {
    const item = resolve([pile(1, { ironing: true, ironSetting: "2" })])[0] as ResolvedInstruction;
    expect(ironLabel(MACHINE, item)).toBe("Medium");
  });

  test("falls back to the raw ironSetting key when the machine has no matching setting", () => {
    const item = resolve([pile(1, { ironing: true, ironSetting: "9" })])[0] as ResolvedInstruction;
    expect(ironLabel(MACHINE, item)).toBe("9");
  });
});

describe("ironCardKey", () => {
  test("is the ironSetting for an ironed pile", () => {
    const item = resolve([pile(1, { ironing: true, ironSetting: "2" })])[0] as ResolvedInstruction;
    expect(ironCardKey(item)).toBe("2");
  });

  test("is 'do-not-iron' for a never-ironed pile, so every no-iron group shares one key", () => {
    const a = resolve([pile(1, { ironing: false, ironSetting: "1" })])[0] as ResolvedInstruction;
    const b = resolve([pile(2, { ironing: false, ironSetting: "2" })])[0] as ResolvedInstruction;
    expect(ironCardKey(a)).toBe("do-not-iron");
    expect(ironCardKey(b)).toBe("do-not-iron");
  });
});

describe("Card temperature", () => {
  // #10: the card hardcoded the Dutch "koud" for a cold wash instead of
  // reading the machine's own word, so a machine that says "cold" printed
  // the literal word "koud" nowhere and "cold °C" instead — the unit
  // tacked onto a word that was never a number.
  test("shows the machine's own word for a non-numeric temperature, no unit", async () => {
    const items = resolve([pile(1, { temperature: "cold" })]);
    const text = (await pageText((await renderPrint(items, MACHINE)).pdf)).join("\n");

    expect(text).toContain("Cottons cold ·");
    expect(text).not.toContain("cold °C");
    expect(text).not.toContain("koud");
  });

  test("still shows a numeric temperature with its unit", async () => {
    const items = resolve([pile(1, { temperature: "60" })]);
    const text = (await pageText((await renderPrint(items, MACHINE)).pdf)).join("\n");

    expect(text).toContain("Cottons 60 °C ·");
  });
});

describe("washTogetherText", () => {
  test("a lone pile with nothing else on the chart washes alone", () => {
    const items = resolve([pile(1)]);
    expect(washTogetherText(items)).toBe("nothing else — wash alone");
  });

  test("a lone pile lists every other chart pile it may share a drum with, comma-separated", () => {
    const items = resolve([
      pile(1),
      pile(2, { clothingType: "Pile 2" }),
      pile(3, { clothingType: "Pile 3" }),
    ]);
    expect(washTogetherText(items.slice(0, 1))).toBe("Pile 2, Pile 3");
  });

  test("a group that can all share a drum reads 'each other'", () => {
    const items = resolve([pile(1), pile(2, { clothingType: "Pile 2" })]);
    expect(washTogetherText(items)).toBe("each other");
  });

  test("a group that can share a drum also lists other chart piles it may join, comma-separated", () => {
    const items = resolve([
      pile(1),
      pile(2, { clothingType: "Pile 2" }),
      pile(3, { clothingType: "Pile 3" }),
      pile(4, { clothingType: "Pile 4" }),
    ]);
    expect(washTogetherText(items.slice(0, 2))).toBe("each other, and Pile 3, Pile 4");
  });

  test("only lists a chart pile that suits every member of the group, not just one", () => {
    // Pile 1 is colour-group "any" (mixes with everything settings-compatible);
    // Pile 2 is "white"; Pile 3 is "dark" — compatible with Pile 1 alone, so it
    // must not appear even though one of the two group members would take it.
    const items = resolve([
      pile(1, { colourGroup: "any" }),
      pile(2, { clothingType: "Pile 2", colourGroup: "white" }),
      pile(3, { clothingType: "Pile 3", colourGroup: "dark" }),
    ]);
    expect(washTogetherText(items.slice(0, 2))).toBe("each other");
  });

  test("same settings but incompatible colours can't share a drum despite matching everything else", () => {
    const items = resolve([
      pile(1, { colourGroup: "white" }),
      pile(2, { clothingType: "Pile 2", colourGroup: "dark" }),
    ]);
    expect(washTogetherText(items)).toBe(
      "same settings, but wash these separately — see the matrix",
    );
  });
});

describe("sheetGroups", () => {
  test("full variant (cardGroups) splits on wash settings and on ironSetting alike", () => {
    const items = resolve([
      pile(1, { temperature: "40", ironSetting: "1" }),
      pile(2, { temperature: "40", ironSetting: "2" }),
    ]);
    expect(sheetGroups(items, MACHINE, "full").length).toBe(2);
  });

  test("wash variant merges piles that only disagree on ironSetting", () => {
    const items = resolve([
      pile(1, { temperature: "40", ironSetting: "1" }),
      pile(2, { temperature: "40", ironSetting: "2" }),
    ]);
    expect(sheetGroups(items, MACHINE, "wash").length).toBe(1);
  });

  test("iron variant merges piles that only disagree on wash settings", () => {
    const items = resolve([
      pile(1, { temperature: "40", ironSetting: "1" }),
      pile(2, { temperature: "60", ironSetting: "1" }),
    ]);
    expect(sheetGroups(items, MACHINE, "iron").length).toBe(1);
  });
});

describe("protectsReferenceCredit", () => {
  test("is false throughout when nothing in the group carries a citation", () => {
    const group = Array.from({ length: 10 }, () => ({ referenceName: "" }));
    for (let index = 0; index < group.length; index++) {
      expect(protectsReferenceCredit(index, group)).toBe(false);
    }
  });

  test("protects only the trailing REFERENCE_CREDIT_PROTECTED_ROWS rows when a citation exists", () => {
    const group = Array.from({ length: 10 }, (_, index) =>
      index === 0 ? { referenceName: "Manufacturer care guide" } : { referenceName: "" },
    );

    expect(protectsReferenceCredit(3, group)).toBe(false);
    expect(protectsReferenceCredit(4, group)).toBe(true);
    expect(protectsReferenceCredit(9, group)).toBe(true);
  });

  test("protects every row when the whole group is shorter than the protected window", () => {
    const group = [{ referenceName: "Manufacturer care guide" }, { referenceName: "" }];

    expect(protectsReferenceCredit(0, group)).toBe(true);
    expect(protectsReferenceCredit(1, group)).toBe(true);
  });
});

describe("cardChrome", () => {
  test("compact scales the outer padding/margin and heading font size down", () => {
    expect(cardChrome(true)).toEqual({ padding: 8, marginBottom: 8, headingSize: 11 });
  });

  test("non-compact (the default) is roomier throughout", () => {
    expect(cardChrome(false)).toEqual({ padding: 10, marginBottom: 12, headingSize: 13 });
  });
});

describe("matrixLayout", () => {
  test("labelWidth and available narrow together with density", () => {
    const layout = matrixLayout(2, 1);
    expect(layout.labelWidth).toBe(118);
    expect(layout.available).toBeCloseTo(405.28);
  });

  test("cell divides the available width by however many columns actually appear in a block", () => {
    // Fewer items than fit in a block: cell is available / itemCount.
    const wide = matrixLayout(2, 1);
    expect(wide.columnsPerBlock).toBe(28);
    expect(wide.cell).toBeCloseTo(202.64);

    // More items than fit in a block: cell is available / columnsPerBlock,
    // not available / itemCount — the same scenario
    // overflow-guards.test.ts exercises through a full render (40 piles at
    // density 0.7).
    const narrow = matrixLayout(40, 0.7);
    expect(narrow.columnsPerBlock).toBe(31);
    expect(narrow.cell).toBeCloseTo(440.68 / 31);
    expect(narrow.cell).toBeGreaterThanOrEqual(MIN_MATRIX_CELL);
  });

  test("columnsPerBlock never drops below 1, even when density leaves almost no room", () => {
    const layout = matrixLayout(1, 4.4);
    expect(layout.columnsPerBlock).toBe(1);
  });
});

describe("gist", () => {
  test("takes the text up to the first period, colon or em dash", () => {
    expect(gist("Colour liquid detergent")).toBe("Colour liquid detergent");
    expect(gist("Woolite — for delicates")).toBe("Woolite");
    expect(gist("Non-bio: fragrance-free")).toBe("Non-bio");
    expect(gist("Store bought. Keep sealed.")).toBe("Store bought");
  });

  test("trims surrounding whitespace off the clause", () => {
    expect(gist("  Padded text  — extra")).toBe("Padded text");
  });
});

describe("legendExample", () => {
  test("off is the first programme, example is the second", () => {
    expect(legendExample(["Cottons", "Synthetics", "Wool"])).toEqual({
      off: "Cottons",
      example: "Synthetics",
    });
  });

  test("example falls back to off when there's only one programme to show", () => {
    expect(legendExample(["Cottons"])).toEqual({ off: "Cottons", example: "Cottons" });
  });

  test("both fall back to '' for a machine with no programmes at all", () => {
    expect(legendExample([])).toEqual({ off: "", example: "" });
  });
});

describe("legendHottestSetting", () => {
  test("is the last setting's key, coolest-to-hottest order", () => {
    expect(legendHottestSetting([{ key: "1" }, { key: "2" }, { key: "3" }])).toBe("3");
  });

  test("falls back to '' for a machine with no iron settings at all", () => {
    expect(legendHottestSetting([])).toBe("");
  });
});

describe("steamColumnValue", () => {
  test("is 'yes' for an ironed pile at a setting inside the steam zone", () => {
    const item = resolve([pile(1, { ironing: true, ironSetting: "3" })])[0] as ResolvedInstruction;
    expect(steamColumnValue(MACHINE, item)).toBe("yes");
  });

  test("is '—' for an ironed pile at a setting below the steam zone", () => {
    const item = resolve([pile(1, { ironing: true, ironSetting: "1" })])[0] as ResolvedInstruction;
    expect(steamColumnValue(MACHINE, item)).toBe("—");
  });

  test("is '—' for a never-ironed pile, whatever its ironSetting says", () => {
    const item = resolve([pile(1, { ironing: false, ironSetting: "3" })])[0] as ResolvedInstruction;
    expect(steamColumnValue(MACHINE, item)).toBe("—");
  });

  test("is '—' when the machine has no matching setting to check steam on", () => {
    const item = resolve([pile(1, { ironing: true, ironSetting: "9" })])[0] as ResolvedInstruction;
    expect(steamColumnValue(MACHINE, item)).toBe("—");
  });
});

describe("summaryColumns", () => {
  // #15: the widths are laid out by hand, not flexed, so nothing stops them
  // drifting past the page's printable width except this test — the "full"
  // and "wash" variants had already overrun it by 5pt before this landed.
  for (const variant of variants) {
    test(`${variant} stays within the table width budget`, () => {
      const width = summaryColumns(MACHINE, variant).reduce(
        (total, column) => total + column.width,
        ROW_NUMBER_GUTTER,
      );

      expect(width).toBeLessThanOrEqual(TABLE_WIDTH_BUDGET);
    });
  }
});

describe("MixMatrix blocker legend", () => {
  test("a real blocker's row names its lowercased reason, not the original case", async () => {
    const items = resolve([
      pile(1, { colourGroup: "white" }),
      pile(2, { clothingType: "Pile 2", colourGroup: "dark" }),
    ]);
    const text = (await pageText((await renderPrint(items, MACHINE)).pdf)).join("\n");

    expect(text).toContain("colours would run into each other");
    expect(text).not.toContain("Colours would run into each other");
  });

  // The em dash between a legend row's code and its reason doesn't survive
  // pdf-lib's text extraction for this font (same reason #30's "empty
  // referenceName" test above checks for its absence rather than its
  // presence), so it's pinned by content-stream hash instead, same
  // technique and reason as the "Legend"/"PhoneDocument content" tests.
  test("a real blocker's row includes the em dash between its code and reason", async () => {
    const items = resolve([
      pile(1, { colourGroup: "white" }),
      pile(2, { clothingType: "Pile 2", colourGroup: "dark" }),
    ]);
    const { pdf: bytes } = await renderPrint(items, MACHINE);

    expect(await pageInk(bytes, 1)).toBe("a5ea2692dd61b4a8");
  });
});

describe("card reference citation", () => {
  // #30: `Instruction` gained `referenceName`/`referenceLink` (@washy-washy/core@1.3.0)
  // but nothing here drew them — a chart carrying real citations still
  // printed cards with no visible trace of who backed up an instruction.
  test("a set referenceName appears on the card", async () => {
    const items = resolve([pile(1, { referenceName: "Manufacturer care guide" })]);
    const text = (await pageText((await renderPrint(items, MACHINE)).pdf)).join("\n");

    expect(text).toContain("Manufacturer care guide");
  });

  test("an empty referenceName changes nothing", async () => {
    const uncited = resolve([pile(1)]);
    const text = (await pageText((await renderPrint(uncited, MACHINE)).pdf)).join("\n");

    expect(text).not.toContain("—");
    expect(text).not.toContain("Manufacturer care guide");
  });

  test("a referenceLink renders as a reachable PDF link annotation", async () => {
    const items = resolve([
      pile(1, {
        referenceName: "Manufacturer care guide",
        referenceLink: "https://example.com/care-guide",
      }),
    ]);
    const { pdf: bytes } = await renderPrint(items, MACHINE);

    // pdf-lib exposes annotation dicts, but not the /URI action inside one
    // in a typed way worth the code here — the raw stream is unambiguous:
    // a URI PDF action stores the target literally as `(https://…)`.
    const raw = Buffer.from(bytes).toString("latin1");
    expect(raw).toContain("https://example.com/care-guide");
  });

  test("no referenceLink means no link annotation, just the credited name", async () => {
    const items = resolve([pile(1, { referenceName: "Manufacturer care guide" })]);
    const { pdf: bytes } = await renderPrint(items, MACHINE);

    expect(Buffer.from(bytes).toString("latin1")).not.toContain("/Subtype /Link");
  });

  test("different citations within one shared-settings group are each attributed to their own pile", async () => {
    const items = resolve([
      pile(1, { referenceName: "Manufacturer care guide" }),
      pile(2, { clothingType: "Pile 2", referenceName: "Fabric care label" }),
    ]);
    const text = (await pageText((await renderPrint(items, MACHINE)).pdf)).join("\n");

    expect(text).toContain("Pile 1: Manufacturer care guide");
    expect(text).toContain("Pile 2: Fabric care label");
  });
});

describe("Loads bold-group caption", () => {
  // #25: bold pile names meant "these share one wash," with no explanation
  // on the page — the only cue was the "(on its own)" suffix on solo rows,
  // which says nothing about what the absence of that suffix, plus bold
  // type, is supposed to mean.
  test("explains what bold means, without pushing the reference sheet onto a near-blank overflow page", async () => {
    const items = resolve([pile(1), pile(2, { clothingType: "Pile 2" })]);
    const result = await renderPrint(items, MACHINE);
    const text = (await pageText(result.pdf)).join("\n");

    expect(text).toContain("share one wash");
    // Same guard #26 added for the legend row: a caption that quietly grows
    // the reference sheet's own section past one page leaves a near-blank
    // page behind rather than failing outright.
    expect((await inkPerPage(result.pdf)).filter((ink) => ink < 1000)).toEqual([]);
  });

  test("a pile that can't share a load with anyone reads '(on its own)', not bold", async () => {
    const items = resolve([pile(1, { mixTags: ["solo"] })]);
    const text = (await pageText((await renderPrint(items, MACHINE)).pdf)).join("\n");

    expect(text).toContain("(on its own)");
  });
});

describe("Card wash/iron section order", () => {
  // #32: the card printed dial/chips, Detergent, Iron, Drying, then "Wash
  // together with" last — splitting the wash-phase fields apart with the
  // iron section in the middle, and burying "Wash together with" after
  // Drying instead of grouping it with the rest of the wash phase. GINETEX
  // orders care information Washing before Ironing; washy-washy-web hit
  // and fixed the identical defect in its own card component (#83/#84).
  test("groups the wash-phase fields together, unbroken, with iron last before Notes", async () => {
    const items = resolve([pile(1, { notes: "Check the label first." })]);
    const pages = await pageText((await renderPrint(items, MACHINE)).pdf);
    // The reference table's own "Iron" column, on an earlier page, would
    // otherwise be the first hit for "IRON" — the card itself is the page
    // carrying "DETERGENT", which only the card prints.
    const cardText = pages.find((page) => page.includes("DETERGENT"));
    if (cardText === undefined) throw new Error("no card page found");

    const order = ["WASH", "DETERGENT", "WASH TOGETHER WITH", "DRYING", "IRON", "NOTES"].map(
      (label) => cardText.indexOf(label),
    );
    expect(order.every((position) => position !== -1)).toBe(true);
    expect(order).toEqual([...order].sort((a, b) => a - b));
  });

  test("a washing-only card has a Wash heading and no Iron section", async () => {
    const items = resolve([pile(1)]);
    const pages = await pageText((await renderPrint(items, MACHINE, "wash")).pdf);
    const cardText = pages.find((page) => page.includes("DETERGENT"));
    if (cardText === undefined) throw new Error("no card page found");

    expect(cardText).toContain("WASH");
    expect(cardText).not.toContain("IRON");
  });
});

describe("Legend", () => {
  // The iron-variant legend's caption reads "the red pointer is where to
  // turn it" — it always illustrates the pointer state, never the
  // crossed-out ring, so its own dial is off={false} unconditionally. No
  // surrounding text distinguishes the two (unlike a real pile's card,
  // where an "off" dial pairs with "Do not iron"), so this pins the
  // reference sheet's first page — the one the legend is on — by its
  // content-stream hash (`pageInk`, the same drift guard
  // `scripts/screenshots.ts` uses for the README shots) rather than by
  // reading text. Confirmed empirically to change (6382 vs 6318 bytes for
  // this exact fixture) if `off` were flipped to `true`. Recompute this
  // hash only when the legend's own drawing deliberately changes.
  test("the iron-variant example dial reads as the pointer state, not crossed-out", async () => {
    const items = resolve([pile(1)]);
    const { pdf } = await renderPrint(items, MACHINE, "iron");

    expect(await pageInk(pdf, 1)).toBe("5458597462f7f323");
  });
});

describe("PhoneDocument content, pinned per cut", () => {
  // Masthead, Loads, Legend and Card/IronCard all lay out with style props
  // (flexDirection, alignItems, margins, Legend's own `last` default) that
  // never show up in a PDF's extracted text — a mutation to any of them
  // still passes every text-based assertion elsewhere in this file. Pinned
  // by content-stream hash instead, same technique and same reason as the
  // "Legend" test above. Recompute a hash only when one of those
  // components' layout deliberately changes.
  const hashes: Record<Variant, string> = {
    full: "c0cbac76eb4918c2",
    wash: "edd6535b010ab226",
    iron: "b401d8ee41845eb8",
  };

  for (const variant of variants) {
    test(`${variant}: renders the same layout bytes as last confirmed`, async () => {
      const items = resolve([pile(1, { ironing: true, ironSetting: "3" })]);
      const { pdf: bytes } = await renderPhone(items, MACHINE, variant);

      expect(await pageInk(bytes, 1)).toBe(hashes[variant]);
    });
  }
});

describe("PhoneDocument and CardDocument", () => {
  test("renderPhone's title says 'phone', renderCard's says 'card'", async () => {
    const items = resolve([pile(1)]);
    const phone = await PDFDocument.load((await renderPhone(items, MACHINE)).pdf);
    const card = await PDFDocument.load((await renderCard(items, MACHINE)).pdf);

    expect(phone.getTitle()).toContain("phone");
    expect(card.getTitle()).toContain("card");
  });

  test("CardDocument renders IronCard for the iron variant, Card otherwise", async () => {
    const items = resolve([pile(1, { ironing: true, ironSetting: "3" })]);
    const iron = await renderCard(items, MACHINE, "iron");
    const full = await renderCard(items, MACHINE, "full");

    expect((await pageText(iron.pdf)).join("\n")).toContain("Thermostat on High");
    expect((await pageText(full.pdf)).join("\n")).toContain("WASH TOGETHER WITH");
  });

  test('both default to variant "full" when called directly, without renderPhone/renderCard', async () => {
    const items = resolve([pile(1)]);

    const phoneBlob = await pdf(PhoneDocument({ items, height: 2000, machine: MACHINE })).toBlob();
    const phoneText = (await pageText(new Uint8Array(await phoneBlob.arrayBuffer()))).join("\n");
    expect(phoneText).toContain("WASH TOGETHER WITH");

    const cardBlob = await pdf(CardDocument({ items, height: 2000, machine: MACHINE })).toBlob();
    const cardText = (await pageText(new Uint8Array(await cardBlob.arrayBuffer()))).join("\n");
    expect(cardText).toContain("WASH TOGETHER WITH");
  });
});

describe("PrintDocument content, pinned per cut", () => {
  // ReferenceSheet's own layout (its marginTop before the legend row) and
  // Card/IronCard's non-compact style props (PrintDocument is the one
  // caller that renders either without compact) are, like PhoneDocument's
  // own style props above, invisible to a full-render text assertion.
  // Pinned by content-stream hash for the same reason.
  const hashes: Record<Variant, string> = {
    full: "a573d2e8d4755fd7",
    wash: "6896d5183ddf897f",
    // Same fixture and hash the "Legend" test above already pins — this
    // one is pinning the whole page, that one specifically the dial state.
    iron: "5458597462f7f323",
  };

  for (const variant of variants) {
    test(`${variant}: renders the same layout bytes as last confirmed`, async () => {
      const items = resolve([pile(1, { ironing: true, ironSetting: "3" })]);
      const { pdf: bytes } = await renderPrint(items, MACHINE, variant);

      expect(await pageInk(bytes, 1)).toBe(hashes[variant]);
    });
  }
});
