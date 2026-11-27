import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";

/**
 * #160: `id-token: write` is the right to publish to npm, so no job holding it
 * may run code a dependency brought in. One job installs and packs, another
 * publishes that tarball.
 */
type Step = { uses?: string; run?: string; with?: Record<string, string> };
type Job = { needs?: string; permissions?: Record<string, string>; steps: Step[] };
const { jobs } = Bun.YAML.parse(
  readFileSync(new URL("../.github/workflows/release.yml", import.meta.url), "utf8"),
) as { jobs: Record<string, Job> };

const publishing = Object.values(jobs).filter((j) => j.permissions?.["id-token"] === "write");

test("only the publish job gets the OIDC token", () => {
  expect(publishing).toHaveLength(1);
  expect(publishing[0]).toBe(jobs["publish-npm"] as Job);
});

test("the job with the OIDC token runs nothing but the publish", () => {
  const steps = publishing[0]?.steps ?? [];
  const runs = steps.flatMap((s) => (s.run ? [s.run.trim()] : []));
  expect(runs).toEqual(["npm publish ./pkg/*.tgz --provenance --access public --ignore-scripts"]);
  expect(steps.flatMap((s) => (s.uses ? [s.uses.split("@")[0]] : []))).toEqual([
    "actions/setup-node",
    "actions/download-artifact",
  ]);
});

test("it publishes the tarball the job without the token packed", () => {
  const pack = jobs[publishing[0]?.needs ?? ""];
  expect(pack?.permissions).toEqual({ contents: "read" });
  const upload = pack?.steps.find((s) => s.uses?.startsWith("actions/upload-artifact@"));
  const download = publishing[0]?.steps.find((s) =>
    s.uses?.startsWith("actions/download-artifact@"),
  );
  expect(download?.with?.name).toBe(upload?.with?.name as string);
});
