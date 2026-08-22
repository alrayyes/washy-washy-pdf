import { describe, expect, test } from "bun:test";
import type { Instruction, Machine } from "@washy-washy/core/browser";
import { resolve } from "@washy-washy/core/browser";
import { PDFDocument, PDFName, PDFRawStream } from "pdf-lib";
import { renderPrint } from "../src/render";

/**
 * Self-contained fixture rather than a loaded machine file — this package has
 * no CLI, no `data/` directory and no `loadMachine` to read one with, so the
 * appliances a test renders against are just a literal here.
 */
const MACHINE: Machine = {
  washer: {
    name: "Fixture 1400",
    capacity: "8 kg",
    programs: ["Cottons", "Synthetics", "Delicates", "Wool", "Quick wash"],
    temperatures: ["cold", "20", "30", "40", "60", "90"],
    spins: ["400", "800", "1200", "1400"],
    options: ["Eco", "Extra rinse", "Prewash"],
  },
  iron: {
    name: "Fixture iron",
    settings: [
      { key: "1", dots: "•", label: "Low", detail: "Synthetics", steam: false },
      { key: "2", dots: "••", label: "Medium", detail: "Wool, silk", steam: false },
      { key: "3", dots: "•••", label: "High", detail: "Cotton, linen", steam: true },
    ],
  },
};

function pile(index: number): Instruction {
  return {
    clothingType: `Pile ${index}`,
    detergent: "Colour liquid detergent",
    fabricSoftener: false,
    temperature: "40",
    spin: "1200",
    duration: "~2:15",
    program: "Cottons",
    options: ["Eco"],
    ironing: true,
    ironingNotes: "Steam.",
    ironSetting: "3",
    drying: "Line dry.",
    colourGroup: "colour",
    mixTags: [],
    notes: "",
  };
}

/** How many bytes of drawing instructions each page carries. */
async function inkPerPage(bytes: Uint8Array): Promise<number[]> {
  const pdf = await PDFDocument.load(bytes);
  return pdf.getPages().map((page) => {
    const contents = page.node.get(PDFName.of("Contents"));
    const stream = contents ? pdf.context.lookup(contents) : undefined;
    return stream instanceof PDFRawStream ? stream.contents.length : 0;
  });
}

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
