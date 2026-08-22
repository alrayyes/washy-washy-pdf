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
    accentSoft: "#fdeaed",
    steam: "#9ec5e8",
    steamSoft: "#eaf2fa",
    yes: "#15803d",
    no: "#b91c1c",
  },
  font: {
    sans: "Helvetica",
    bold: "Helvetica-Bold",
    oblique: "Helvetica-Oblique",
  },
} as const;
