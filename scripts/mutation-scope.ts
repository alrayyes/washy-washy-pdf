#!/usr/bin/env bun
/**
 * Prints a Stryker `--mutate` value covering only the `src/**\/*.ts(x)` lines
 * that changed against a base ref, in `file:startLine-endLine` mutation-range
 * syntax — the "new/changed code only" gate `rules/testing.md`'s mutation
 * testing section describes for a repo carrying real, tracked inherited debt
 * (`documents.tsx`, washy-washy-pdf#101). Prints nothing when nothing in
 * scope changed, so the CI step can skip the mutation run entirely.
 *
 * Usage: bun run scripts/mutation-scope.ts [baseRef]
 * baseRef defaults to `origin/main`.
 */

const base = process.argv[2] ?? "origin/main";

const diff = await Bun.$`git diff --unified=0 ${base}...HEAD -- src/**/*.ts src/**/*.tsx`
  .quiet()
  .text();

const ranges = new Map<string, [number, number][]>();
let currentFile: string | null = null;

for (const line of diff.split("\n")) {
  const fileMatch = line.match(/^\+\+\+ b\/(.+)$/);
  if (fileMatch?.[1]) {
    currentFile = fileMatch[1];
    continue;
  }

  const hunkMatch = line.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/);
  if (!hunkMatch || !currentFile) continue;

  const start = Number(hunkMatch[1]);
  const count = hunkMatch[2] === undefined ? 1 : Number(hunkMatch[2]);
  if (count === 0) continue; // pure deletion — nothing added to mutate

  const spans = ranges.get(currentFile) ?? [];
  spans.push([start, start + count - 1]);
  ranges.set(currentFile, spans);
}

const entries = [...ranges.entries()].flatMap(([file, spans]) =>
  spans.map(([start, end]) => `${file}:${start}-${end}`),
);

console.log(entries.join(","));
