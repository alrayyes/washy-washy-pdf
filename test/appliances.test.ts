import { describe, expect, test } from "bun:test";
import { requireMachine } from "../src/appliances";
import { MACHINE } from "./fixtures";

describe("requireMachine", () => {
  test("throws when no machine is in context", () => {
    expect(() => requireMachine(null)).toThrow(
      "no machine in context — render inside <ApplianceContext.Provider>",
    );
  });

  test("returns the machine when one is present", () => {
    expect(requireMachine(MACHINE)).toBe(MACHINE);
  });
});
