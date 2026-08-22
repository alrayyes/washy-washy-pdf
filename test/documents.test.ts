import { describe, expect, test } from "bun:test";
import { resolve } from "@washy-washy/core/browser";
import { renderPrint } from "../src/render";
import { MACHINE, pile } from "./fixtures";
import { pageText } from "./pdf-text";

describe("Card temperature", () => {
  // #10: the card hardcoded the Dutch "koud" for a cold wash instead of
  // reading the machine's own word, so a machine that says "cold" printed
  // the literal word "koud" nowhere and "cold °C" instead — the unit
  // tacked onto a word that was never a number.
  test("shows the machine's own word for a non-numeric temperature, no unit", async () => {
    const items = resolve([pile(1, { temperature: "cold" })]);
    const text = (await pageText(await renderPrint(items, MACHINE))).join("\n");

    expect(text).toContain("Cottons cold ·");
    expect(text).not.toContain("cold °C");
    expect(text).not.toContain("koud");
  });

  test("still shows a numeric temperature with its unit", async () => {
    const items = resolve([pile(1, { temperature: "60" })]);
    const text = (await pageText(await renderPrint(items, MACHINE))).join("\n");

    expect(text).toContain("Cottons 60 °C ·");
  });
});
