import { describe, expect, test } from "bun:test";
import { DOCS, inkOf, MANIFEST, type Manifest, pngSize, SHOTS } from "../scripts/screenshots";

/**
 * The screenshots at the top of the README are the first thing anyone sees.
 * `washy-washy-cli` shipped the same PDF-then-PNG setup with no guard on the
 * PNGs and they drifted for three days across three releases before anyone
 * noticed.
 *
 * Rasterising needs poppler, so this can't re-shoot and compare pixels — CI
 * can't rasterise a PDF, and a fresh clone has no file timestamps to trust.
 * What it can do is compare the hash each shot recorded of the page it came
 * from against that page as it stands now. Change the example chart, run
 * `bun run examples`, and this goes red until `bun run screenshots` has run.
 */
const manifest = (await Bun.file(MANIFEST).json()) as Manifest;

describe("the README screenshots", () => {
  test("the manifest lists exactly the shots that are taken", () => {
    expect(Object.keys(manifest).sort()).toEqual(SHOTS.map((shot) => shot.png).sort());
  });

  for (const shot of SHOTS) {
    describe(shot.png, () => {
      test("is committed", async () => {
        expect(await Bun.file(`${DOCS}/${shot.png}`).exists()).toBe(true);
      });

      test("was shot from the PDF as it stands", async () => {
        expect(manifest[shot.png], "run: bun run examples && bun run screenshots").toBe(
          await inkOf(shot),
        );
      });

      /**
       * The README sets a `width=` against these, so a shot taken at the
       * wrong dpi renders at the wrong scale rather than failing outright.
       * Height is only ever the crop's ceiling: the example chart is small
       * enough that a short cut's page can end before the crop does, and
       * pdftoppm never pads past what the page actually drew.
       */
      test("is the width its dpi implies, and no taller than its crop", async () => {
        const size = pngSize(await Bun.file(`${DOCS}/${shot.png}`).bytes());
        if (shot.crop) {
          expect(size.width).toBe(shot.crop.width);
          expect(size.height).toBeGreaterThan(0);
          expect(size.height).toBeLessThanOrEqual(shot.crop.height);
          return;
        }
        // A4 at the shot's dpi, which is what an uncropped page comes out as.
        // Ceil, not round: poppler never drops a partial pixel off the edge.
        expect(size.width).toBe(Math.ceil((595.28 * shot.dpi) / 72));
        expect(size.height).toBe(Math.ceil((841.89 * shot.dpi) / 72));
      });
    });
  }
});
