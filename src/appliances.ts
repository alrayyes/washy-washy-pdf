import type { Machine } from "@washy-washy/core/browser";
import { createContext, useContext } from "react";

/**
 * The machine every drawing is measured against, handed down the tree rather
 * than imported.
 *
 * It used to be a module-level constant, which made the components honest about
 * nothing: any of them could reach for the one machine the process knew about,
 * and rendering two charts for two machines in one run was impossible. A
 * context keeps the dial drawing a function of what it was given.
 */
export const ApplianceContext = createContext<Machine | null>(null);

/**
 * Plain function, not itself a hook — pulled out so the check has a form a
 * test can call directly with `null`, rather than needing a real render
 * tree (and react-pdf's own render pipeline) just to reach a throw.
 */
export function requireMachine(machine: Machine | null): Machine {
  if (!machine) {
    throw new Error("no machine in context — render inside <ApplianceContext.Provider>");
  }
  return machine;
}

export function useMachine(): Machine {
  return requireMachine(useContext(ApplianceContext));
}
