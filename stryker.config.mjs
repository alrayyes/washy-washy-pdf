// @stryker-mutator/core has no official Bun runner yet (open upstream
// request, stryker-mutator/stryker-js#5424). `@hughescr/stryker-bun-runner`
// is chosen over `stryker-mutator-bun-runner` (npm's `latest` is 0.4.0,
// published 2025-07-07, peer-pinned to `@stryker-mutator/core ^9.0.0`, reads
// stalled) and over falling back to `@stryker-mutator/jest-runner` (this
// repo's suite imports from "bun:test", which doesn't exist outside the Bun
// runtime — running it under real Jest isn't a drop-in swap). See
// washy-washy-pdf#89 for the full evaluation.
//
// `@stryker-mutator/core` is pinned to 9.6.1, not the current 10.0.0:
// `@hughescr/stryker-bun-runner`'s latest release still peer-depends on
// `^9.0.0`, and `inPlace: true` below is required for an unrelated reason —
// see that option's comment.
/** @type {import("@stryker-mutator/api/core").PartialStrykerOptions} */
export default {
  // Stryker's default plugin glob is "@stryker-mutator/*" — the bun runner
  // lives outside that scope, so it has to be named explicitly.
  plugins: ["@hughescr/stryker-bun-runner"],
  testRunner: "bun",
  coverageAnalysis: "perTest",
  // Required here, not a preference: this repo's `typescript` (7.0.2, the
  // native/Go rewrite) exports almost nothing from its classic JS API
  // (`require("typescript")` has exactly two keys: `version` and
  // `versionMajorMinor` — confirmed empirically). Stryker core's own
  // sandbox step (`TSConfigPreprocessor`, unconditional whenever `inPlace`
  // is false) calls `ts.parseConfigFileTextToJson`, which no longer
  // exists, and crashes before a single mutant runs. `inPlace` skips that
  // step entirely, mutating the working tree directly (reverted
  // automatically, mutant by mutant) instead of a sandbox copy. This also
  // rules out `@stryker-mutator/typescript-checker` for now — it depends
  // on the same missing compiler API — so it's not a devDependency here.
  inPlace: true,
  mutate: ["src/**/*.ts", "src/**/*.tsx"],
  bun: {
    // `bun.timeout`'s default (10s) covers the *entire* `bun test`
    // subprocess, not one test — and the runner forces `--concurrency=1`
    // for reliable coverage correlation, so a dry run pays this suite's
    // full serial wall-clock (real @react-pdf/renderer + pdf-lib rendering
    // across every test file), not the ~40s a normal parallel `bun test`
    // takes. Confirmed live: the default timed out the dry run outright
    // (`Dry run timed out`) on this machine under ordinary load. Generous
    // rather than tuned tight, since a mutant run pays this same ceiling.
    timeout: 120_000,
  },
  thresholds: {
    high: 100,
    low: 100,
    break: 100,
  },
  reporters: ["html", "clear-text", "progress"],
};
