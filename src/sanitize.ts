import type { ResolvedInstruction } from "@washy-washy/core/browser";

/**
 * Explicit substitutions for characters that read as ordinary prose but
 * don't survive this package's Helvetica font — see CONTRIBUTING.md's
 * WinAnsi gotcha. Curly quotes and an ellipsis are common enough to arrive
 * from a pasted chart without anyone noticing; ≈ and ✓ are the two named
 * in the audit that found this. Em and en dash aren't here — WinAnsi
 * already has them, and they're already confirmed working.
 */
const TRANSLITERATIONS: Record<string, string> = {
  "‘": "'", // ‘ left single quote
  "’": "'", // ’ right single quote
  "“": '"', // “ left double quote
  "”": '"', // ” right double quote
  "…": "...", // … ellipsis
  "≈": "~", // ≈ approximately
  // No WinAnsi checkmark exists. A lowercase "v" is the closest ASCII
  // stand-in that still reads as "done" rather than "wrong".
  "✓": "v", // ✓ check mark
  " ": " ", // non-breaking space
};

/**
 * Characters already confirmed to survive this package's Helvetica font
 * (CONTRIBUTING.md's own list) even though they sit past the plain-ASCII
 * range this module otherwise treats as safe on faith alone.
 */
const CONFIRMED_SAFE = new Set(["•", "°", "—", "–", "·"]);

function isSafe(char: string): boolean {
  const code = char.codePointAt(0) ?? 0;
  if (code <= 0x7f) return true; // ASCII
  if (CONFIRMED_SAFE.has(char)) return true;
  return code >= 0xa0 && code <= 0xff; // Latin-1 supplement
}

export interface Sanitized {
  text: string;
  dropped: string[];
}

/**
 * Transliterates what has a faithful WinAnsi equivalent and strips
 * anything else, reporting what it dropped — the previous behaviour was
 * an unsupported character just vanishing from the rendered PDF with
 * nothing said about it anywhere.
 */
export function sanitizeText(input: string): Sanitized {
  const dropped: string[] = [];
  let text = "";
  for (const char of input) {
    const mapped = TRANSLITERATIONS[char];
    if (mapped !== undefined) {
      text += mapped;
      continue;
    }
    if (isSafe(char)) {
      text += char;
      continue;
    }
    dropped.push(char);
  }
  return { text, dropped };
}

/**
 * Runs every text field a chart row can carry through `sanitizeText`,
 * collecting the distinct characters dropped across the whole chart so a
 * caller can warn once rather than once per field. `mixesWith` entries are
 * sanitized too — they echo other rows' `clothingType`, and sanitizing the
 * same string the same way always produces the same result, so the two
 * stay in agreement.
 */
export function sanitizeInstructions(items: ResolvedInstruction[]): {
  items: ResolvedInstruction[];
  dropped: string[];
} {
  const droppedChars = new Set<string>();
  const clean = (value: string): string => {
    const result = sanitizeText(value);
    for (const char of result.dropped) droppedChars.add(char);
    return result.text;
  };

  const items_ = items.map((item) => ({
    ...item,
    clothingType: clean(item.clothingType),
    detergent: clean(item.detergent),
    temperature: clean(item.temperature),
    spin: clean(item.spin),
    duration: clean(item.duration),
    program: clean(item.program),
    options: item.options.map(clean),
    ironingNotes: clean(item.ironingNotes),
    ironSetting: clean(item.ironSetting),
    drying: clean(item.drying),
    notes: clean(item.notes),
    mixesWith: item.mixesWith.map(clean),
  }));

  return { items: items_, dropped: [...droppedChars] };
}
