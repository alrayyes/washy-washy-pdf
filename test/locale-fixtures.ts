import { type Instruction, type Machine, parseMachine } from "@washy-washy/core/browser";
import arMachineData from "./fixtures/locale-ar.json";
import zhMachineData from "./fixtures/locale-zh.json";

/**
 * Real translated machine data, copied from washy-washy-web's `data/`
 * directory (`washy-washy.ar.json.dist` / `washy-washy.zh.json.dist`, as of
 * 2026-08-30) rather than this package's own English placeholders in
 * `fixtures.ts`. `ar` is right-to-left and `zh` has no natural word-break
 * spacing — the two shapes most likely to break a text-measurement or
 * wrapping assumption the English fixtures never exercise (#59). Refresh by
 * re-copying the `machine` object out of the matching `.json.dist` file over
 * `test/fixtures/locale-ar.json` / `locale-zh.json`.
 */
export const AR_MACHINE: Machine = parseMachine(arMachineData);
export const ZH_MACHINE: Machine = parseMachine(zhMachineData);

function localePile(
  machine: Machine,
  index: number,
  overrides: Partial<Instruction> = {},
): Instruction {
  const program = machine.washer.programs[index % machine.washer.programs.length] as string;
  const nextProgram = machine.washer.programs[
    (index + 1) % machine.washer.programs.length
  ] as string;
  const ironSetting = machine.iron.settings.at(-2) ?? machine.iron.settings.at(0);
  if (!ironSetting) throw new Error("locale fixture machine has no iron settings");

  return {
    // Sanitize strips almost all of `program` for these two locales (see
    // locale-overflow.test.ts), which would otherwise leave most piles with
    // an identical (empty) clothingType and trip react-pdf's duplicate-key
    // warning — the index keeps every pile distinct the way a real chart's
    // piles are.
    clothingType: `${index}. ${program}`,
    detergent: machine.washer.name,
    fabricSoftener: false,
    temperature: machine.washer.temperatures[3] ?? (machine.washer.temperatures[0] as string),
    spin: machine.washer.spins[machine.washer.spins.length - 1] as string,
    duration: "~2:15",
    program,
    options: machine.washer.options,
    ironing: true,
    ironingNotes: ironSetting.detail,
    ironSetting: ironSetting.key,
    drying: nextProgram,
    colourGroup: "colour",
    mixTags: [],
    // Every programme name joined with no ASCII separator survives sanitize
    // as a no-break run for `zh` — the shape #59 flagged as a wrapping risk
    // English text never produces.
    notes: machine.washer.programs.join(""),
    referenceName: "",
    referenceLink: "",
    ...overrides,
  };
}

export const arPile = (index: number, overrides: Partial<Instruction> = {}): Instruction =>
  localePile(AR_MACHINE, index, overrides);

export const zhPile = (index: number, overrides: Partial<Instruction> = {}): Instruction =>
  localePile(ZH_MACHINE, index, overrides);
