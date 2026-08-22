import type { Instruction, Machine } from "@washy-washy/core/browser";

/**
 * Self-contained fixture rather than a loaded machine file — this package has
 * no CLI, no `data/` directory and no `loadMachine` to read one with, so the
 * appliances a test renders against are just a literal here.
 */
export const MACHINE: Machine = {
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

export function pile(index: number, overrides: Partial<Instruction> = {}): Instruction {
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
    ...overrides,
  };
}
