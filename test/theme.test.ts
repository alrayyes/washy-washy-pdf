import { describe, expect, test } from "bun:test";
import { theme } from "../src/theme";

/** WCAG 2 relative luminance and contrast ratio, straight off the spec. */
function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16) / 255);
  const linear = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * linear(r ?? 0) + 0.7152 * linear(g ?? 0) + 0.0722 * linear(b ?? 0);
}

function contrast(a: string, b: string): number {
  const [l1 = 0, l2 = 0] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

describe("mix matrix colour", () => {
  // #11: blocker codes used to render in colour.faint on white — under 2.5:1,
  // below every WCAG threshold — while the benign "OK" got full-strength dark
  // green. The cell that ruins a garment was the faintest ink on the page.
  test("a blocker's text meets WCAG AA against its white cell", () => {
    expect(contrast(theme.colour.no, "#ffffff")).toBeGreaterThanOrEqual(4.5);
  });

  test("a blocker reads with more emphasis than an OK", () => {
    const blocker = contrast(theme.colour.no, "#ffffff");
    const ok = contrast(theme.colour.muted, theme.colour.yesSoft);

    expect(blocker).toBeGreaterThan(ok);
  });
});
