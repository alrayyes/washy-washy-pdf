import { expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";

/**
 * rules/dependencies.md: a pull request fails only on the advisories it
 * introduces, and a scan of main keeps one ticket for the rest. Neither takes
 * an ignore list, since an ignore hides a finding from the only place that
 * tracks it.
 */
const dir = new URL("../.github/workflows/", import.meta.url);
const read = (name: string) => readFileSync(new URL(name, dir), "utf8");

type Step = { uses?: string; run?: string; with?: Record<string, string> };
type Job = { if?: string; permissions?: Record<string, string>; steps: Step[] };
const parse = (name: string) =>
  Bun.YAML.parse(read(name)) as {
    on: Record<string, { branches?: string[]; paths?: string[] }>;
    jobs: Record<string, Job>;
  };

const advisoryScan = (s: Step) => /^alrayyes\/advisory-scan@[0-9a-f]{40}$/.test(s.uses ?? "");

test("no workflow ignores an advisory", () => {
  for (const name of readdirSync(dir)) expect(read(name), name).not.toMatch(/--ignore[= ]/);
});

test("the audit job gates on what the change introduces", () => {
  const audit = parse("check.yml").jobs.audit;
  const gate = audit?.steps.filter(advisoryScan) ?? [];
  expect(gate).toHaveLength(1);
  expect(gate[0]?.with?.mode).toBe("gate");
  expect(gate[0]?.with?.command).toBe("bun audit");
  expect(audit?.steps.some((s) => s.run?.includes("git diff --name-only"))).toBe(true);
});

test("a scan of main keeps the advisory ticket, daily, on lockfile pushes and on dispatch", () => {
  const scan = parse("advisory-scan.yml");
  expect(scan.on.schedule).toHaveLength(1);
  expect(scan.on.push?.branches).toEqual(["main"]);
  expect(scan.on.push?.paths).toEqual(expect.arrayContaining(["package.json", "bun.lock"]));
  expect("workflow_dispatch" in scan.on).toBe(true);
  expect("pull_request" in scan.on).toBe(false);
  const job = Object.values(scan.jobs)[0];
  expect(job?.permissions).toEqual({ contents: "read", issues: "write" });
  const step = job?.steps.find(advisoryScan);
  expect(step?.with?.mode).toBe("scan");
  expect(step?.with?.command).toBe("bun audit");
});
