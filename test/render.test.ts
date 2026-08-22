import { describe, expect, test } from "bun:test";
import { resolve } from "@washy-washy/core/browser";
import { renderPrint } from "../src/render";
import { MACHINE, pile } from "./fixtures";
import { inkPerPage } from "./pdf-text";

describe("renderPrint", () => {
  /**
   * Adding a pile is a CSV edit, and it costs the reference sheet a row in the
   * summary table and another in the matrix. Past fifteen or so piles that runs
   * off the bottom of the A4, and @react-pdf answers a page it cannot fit with
   * an almost empty sheet rather than an error.
   */
  test("keeps the reference sheet on one page as piles pile up", async () => {
    const items = resolve(Array.from({ length: 24 }, (_, index) => pile(index + 1)));

    expect(
      (await inkPerPage(await renderPrint(items, MACHINE))).filter((ink) => ink < 1000),
    ).toEqual([]);
  }, 60_000);
});
