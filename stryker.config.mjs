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
// `^9.0.0`.
/** @type {import("@stryker-mutator/api/core").PartialStrykerOptions} */
export default {
  // Stryker's default plugin glob is "@stryker-mutator/*" — the bun runner
  // lives outside that scope, so it has to be named explicitly.
  plugins: ["@hughescr/stryker-bun-runner"],
  testRunner: "bun",
  coverageAnalysis: "perTest",
  mutate: ["src/**/*.ts", "src/**/*.tsx"],
  thresholds: {
    high: 100,
    low: 100,
    break: 100,
  },
  reporters: ["html", "clear-text", "progress"],
};
