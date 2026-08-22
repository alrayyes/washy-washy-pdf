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

export function useMachine(): Machine {
  const machine = useContext(ApplianceContext);
  if (!machine) {
    throw new Error("no machine in context — render inside <ApplianceContext.Provider>");
  }
  return machine;
}
