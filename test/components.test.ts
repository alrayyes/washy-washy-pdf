import { describe, expect, test } from "bun:test";
import { resolve } from "@washy-washy/core/browser";
import { crossedOutRing } from "../src/components";
import { renderCard, renderPrint } from "../src/render";
import { MACHINE, pile } from "./fixtures";
import { pageText } from "./pdf-text";

describe("IronPanel", () => {
  test("a never-ironed pile reads 'Do not iron' on the full-cut card", async () => {
    const items = resolve([pile(1, { ironing: false, ironSetting: "" })]);

    const text = (await pageText((await renderCard(items, MACHINE, "full")).pdf)).join("\n");

    expect(text).toContain("Do not iron");
  });

  test("a below-steam-zone setting says so on the full-cut card", async () => {
    // Setting "1" in the fixture machine has steam: false.
    const items = resolve([pile(1, { ironing: true, ironSetting: "1" })]);

    const text = (await pageText((await renderCard(items, MACHINE, "full")).pdf)).join("\n");

    expect(text).toContain("below the steam zone");
  });
});

describe("SoftenerBadge", () => {
  test("reads NO SOFTENER by default", async () => {
    const items = resolve(Array.from({ length: 24 }, (_, index) => pile(index + 1)));

    const text = (await pageText((await renderPrint(items, MACHINE)).pdf)).join("\n");

    expect(text).toContain("NO SOFTENER");
  });

  test("reads SOFTENER OK when the pile actually calls for one", async () => {
    const items = resolve([pile(1, { fabricSoftener: true })]);

    const text = (await pageText((await renderCard(items, MACHINE, "full")).pdf)).join("\n");

    expect(text).toContain("SOFTENER OK");
  });
});

describe("Prose", () => {
  // Card's Notes field passes a ReferenceCredit as `trailing` — a citation
  // still has to render even when every pile's own notes are blank, since
  // it credits the source, not the note.
  test("still renders a trailing citation when every pile's notes are blank", async () => {
    const items = resolve([
      pile(1, {
        notes: "",
        referenceName: "Dirty Labs",
        referenceLink: "https://example.com/dirty-labs",
      }),
    ]);

    const text = (await pageText((await renderCard(items, MACHINE, "full")).pdf)).join("\n");

    expect(text).toContain("Dirty Labs");
  });
});

describe("crossedOutRing", () => {
  test("sits 6 units inside the outer radius", () => {
    expect(crossedOutRing(50, 47).radius).toBe(41);
    expect(crossedOutRing(30, 20).radius).toBe(14);
  });

  test("the diagonal runs from 225° to 45° around the given centre", () => {
    const centre = 50;
    const outer = 47;
    const radius = outer - 6;
    const radians225 = ((225 - 90) * Math.PI) / 180;
    const radians45 = ((45 - 90) * Math.PI) / 180;

    const ring = crossedOutRing(centre, outer);

    expect(ring.from.x).toBe(centre + radius * Math.cos(radians225));
    expect(ring.from.y).toBe(centre + radius * Math.sin(radians225));
    expect(ring.to.x).toBe(centre + radius * Math.cos(radians45));
    expect(ring.to.y).toBe(centre + radius * Math.sin(radians45));
  });
});
