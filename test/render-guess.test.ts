import { describe, expect, test } from "bun:test";
import { ironGroups, ironSettingKeys, resolve, washGroups } from "@washy-washy/core/browser";
import { guessCardHeight, guessHeight } from "../src/render";
import { MACHINE, pile } from "./fixtures";

describe("guessHeight", () => {
  test("full variant: chart-wide chrome plus every prose field's length", () => {
    const items = resolve([pile(1), pile(2, { notes: "Zip separately." })]);
    const prose = items.reduce(
      (total, item) => total + item.detergent.length + item.drying.length + item.notes.length,
      0,
    );
    const ironingNotes = items.reduce((total, item) => total + item.ironingNotes.length, 0);

    expect(guessHeight(items, MACHINE, "full")).toBe(
      260 + items.length * 250 + (prose + ironingNotes) * 0.35,
    );
  });

  test("wash variant: one row of chrome per wash group, no ironing-notes weight", () => {
    const items = resolve([pile(1), pile(2, { program: "Wool", temperature: "30" })]);
    const prose = items.reduce(
      (total, item) => total + item.detergent.length + item.drying.length + item.notes.length,
      0,
    );

    expect(guessHeight(items, MACHINE, "wash")).toBe(
      260 + washGroups(items).length * 190 + prose * 0.35,
    );
  });

  test("iron variant: card chrome per iron group, plus per-item and ironing-notes weight", () => {
    const items = resolve([
      pile(1, { ironSetting: "1" }),
      pile(2, { ironSetting: "3", ironingNotes: "No steam on the trim." }),
    ]);
    const cards = ironGroups(items, ironSettingKeys(MACHINE)).length;
    const ironingNotes = items.reduce((total, item) => total + item.ironingNotes.length, 0);

    expect(guessHeight(items, MACHINE, "iron")).toBe(
      200 + cards * 110 + items.length * 12 + ironingNotes * 0.35,
    );
  });
});

describe("guessCardHeight", () => {
  test("iron variant: fixed chrome plus ironing-notes weight only", () => {
    const items = resolve([pile(1, { ironingNotes: "Cool iron, reverse side." })]);
    const ironingNotes = items.reduce((total, item) => total + item.ironingNotes.length, 0);

    expect(guessCardHeight(items, "iron")).toBe(160 + ironingNotes * 0.5);
  });

  test("full/wash variant: fixed chrome plus every prose field's weight", () => {
    const items = resolve([pile(1), pile(2, { notes: "Hang to dry." })]);
    const prose = items.reduce(
      (total, item) => total + item.detergent.length + item.drying.length + item.notes.length,
      0,
    );
    const ironingNotes = items.reduce((total, item) => total + item.ironingNotes.length, 0);

    expect(guessCardHeight(items, "full")).toBe(190 + (prose + ironingNotes) * 0.4);
    expect(guessCardHeight(items, "wash")).toBe(190 + (prose + ironingNotes) * 0.4);
  });
});
