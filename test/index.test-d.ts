// Type-checked usage example, the closest TypeScript equivalent to Go's
// ExampleFoo — see rules/javascript.md's "Type-checked documentation"
// section. tsd checks these assertions against the compiler; it never runs
// this file, so `declare const` stands in for real chart data.
//
// Imports from ../dist, not ../src: tsd only supports classic/node16/nodenext
// module resolution (never "bundler", which the rest of this repo uses), and
// the built dist/index.d.ts is a single flattened bundle with no relative
// imports of its own to trip that up — checking against it is also the more
// honest test, since it's the actual published surface, the same thing
// check.yml's "npm pack --dry-run" step already guards. `bun run build`
// has to run before this. Keep this in step with README.md's "Usage"
// section — a signature change here is a signature change there.
import type { Instruction, Machine, ResolvedInstruction } from "@washy-washy/core";
import { resolve } from "@washy-washy/core";
import type { ReactElement } from "react";
import { expectAssignable, expectType } from "tsd";
import {
  CardDocument,
  PhoneDocument,
  type PhoneRender,
  PrintDocument,
  ReferenceDocument,
  renderCard,
  renderPhone,
  renderPrint,
} from "../dist/index.js";

declare const instructions: Instruction[];
declare const machine: Machine;

const items = resolve(instructions);
expectType<ResolvedInstruction[]>(items);

expectType<Promise<PhoneRender>>(renderPhone(items, machine));
expectType<Promise<PhoneRender>>(renderCard(items.slice(0, 1), machine));
expectType<Promise<{ pdf: Uint8Array; dropped: string[] }>>(renderPrint(items, machine));

// The variant split-sheet parameter — every drawing function takes it.
expectType<Promise<PhoneRender>>(renderPhone(items, machine, "wash"));
expectType<Promise<PhoneRender>>(renderPhone(items, machine, "iron", 8));

// The document components, exported directly for a caller driving their own
// react-pdf pipeline instead of the bisecting helpers above.
expectAssignable<ReactElement>(PhoneDocument({ items, height: 900, machine }));
expectAssignable<ReactElement>(CardDocument({ items: items.slice(0, 1), height: 500, machine }));
expectAssignable<ReactElement>(PrintDocument({ items, machine, density: 1 }));
expectAssignable<ReactElement>(ReferenceDocument({ items, machine, density: 1 }));
