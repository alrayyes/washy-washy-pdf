/** One place for every colour and size, so the two documents stay in step. */
export const theme = {
  colour: {
    ink: "#18181b",
    body: "#3f3f46",
    muted: "#71717a",
    faint: "#a1a1aa",
    line: "#d4d4d8",
    hairline: "#e4e4e7",
    panel: "#f4f4f5",
    /** Bosch fascia red — the dial arc and the pointer. */
    accent: "#d1132b",
    steam: "#9ec5e8",
    yes: "#15803d",
    yesSoft: "#dcf3e3",
    no: "#b91c1c",
    /** Page backgrounds and cells that sit on plain white, not the panel grey. */
    paper: "#ffffff",
    /** The dial knob — the one greyscale value that isn't already a token. */
    knob: "#e8e8ea",
  },
  font: {
    sans: "Helvetica",
    bold: "Helvetica-Bold",
    oblique: "Helvetica-Oblique",
  },
  /**
   * Every text size in use, named for where it reads rather than derived from
   * a formula — the sizes were tuned by eye per element, not on a ratio, and
   * this scale exists so a size is looked up once instead of retyped, not to
   * pretend there's a mathematical relationship that isn't there.
   */
  type: {
    micro: 5.5,
    tiny: 5.8,
    chip: 6.4,
    label: 6,
    small: 6.2,
    footnote: 6.5,
    muted: 6.6,
    cell: 6.8,
    base: 7,
    prose: 7.2,
    note: 7.4,
    subtitle: 7.5,
    body: 7.6,
    strong: 8,
    emphasis: 8.5,
    heading: 11,
    headingLarge: 13,
    title: 15,
  },
  /**
   * The border widths, radii and paddings that repeat across panels and
   * cards. Sub-pixel line-height multipliers and density-scaled multipliers
   * (`2.6 * density` and its kin) stay local — they're typographic or
   * fitting fine-tuning, not a reusable layout constant.
   */
  space: {
    hairlineWidth: 0.4,
    ruleWidth: 0.6,
    edgeWidth: 0.8,
    xs: 2,
    sm: 3,
    sm2: 3.5,
    md: 4,
    base: 5,
    base2: 6,
    lg: 8,
    xl: 10,
    xxl: 12,
    xxxl: 14,
  },
} as const;
