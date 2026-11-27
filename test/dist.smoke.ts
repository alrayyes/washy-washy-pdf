import { expect, test } from "bun:test";
import { resolve } from "@washy-washy/core/browser";
import { renderCard } from "../dist/index.js";
import { MACHINE, pile } from "./fixtures";

// #159: every other test imports src/, so a build tool that emitted broken
// JavaScript with correct types would still pass and be published. Run by
// `bun run test:dist`, after a build. The name keeps it out of a bare
// `bun test`, which runs beside the build in the pre-push hook.
test("the built package renders a PDF", async () => {
  const { pdf } = await renderCard(resolve([pile(1)]), MACHINE);

  expect(new TextDecoder().decode(pdf.slice(0, 5))).toBe("%PDF-");
});
