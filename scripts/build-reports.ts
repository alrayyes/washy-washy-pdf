#!/usr/bin/env bun
/**
 * Builds the two HTML pages the published reports need: a coverage view from
 * `coverage/lcov.info` (bun has no HTML reporter) and the index that lists
 * every report with its commit and date.
 *
 * Usage: bun run scripts/build-reports.ts <outDir> <commit> <date>
 * Reads coverage/lcov.info; writes <outDir>/index.html and
 * <outDir>/coverage/index.html.
 */

export interface FileCoverage {
  file: string;
  found: number;
  hit: number;
}

const escapeHtml = (text: string): string =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const percent = (hit: number, found: number): string =>
  `${(found === 0 ? 0 : (hit / found) * 100).toFixed(1)}%`;

export function parseLcov(lcov: string): FileCoverage[] {
  const files: FileCoverage[] = [];
  let current: FileCoverage | undefined;
  for (const line of lcov.split("\n")) {
    if (line.startsWith("SF:")) {
      current = { file: line.slice(3), found: 0, hit: 0 };
    } else if (current && line.startsWith("LF:")) {
      current.found = Number(line.slice(3));
    } else if (current && line.startsWith("LH:")) {
      current.hit = Number(line.slice(3));
    } else if (current && line === "end_of_record") {
      files.push(current);
      current = undefined;
    }
  }
  return files;
}

const page = (title: string, body: string): string => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<style>
  :root { color-scheme: light dark; }
  body { font: 16px/1.5 system-ui, sans-serif; margin: 0 auto; max-width: 48rem; padding: 1rem; }
  table { border-collapse: collapse; width: 100%; }
  th, td { border-bottom: 1px solid #8884; padding: 0.25rem 0.5rem; text-align: left; }
  td.n, th.n { text-align: right; }
</style>
</head>
<body>
${body}
</body>
</html>
`;

export function coverageIndex(files: FileCoverage[]): string {
  const found = files.reduce((sum, f) => sum + f.found, 0);
  const hit = files.reduce((sum, f) => sum + f.hit, 0);
  const rows = files
    .map(
      (f) =>
        `<tr><td>${escapeHtml(f.file)}</td><td class="n">${f.hit}/${f.found}</td><td class="n">${percent(f.hit, f.found)}</td></tr>`,
    )
    .join("\n");
  return page(
    "Coverage",
    `<h1>Coverage</h1>
<p>Line coverage: <strong>${percent(hit, found)}</strong> (${hit} of ${found} lines).
Raw files: <a href="coverage.xml">coverage.xml</a> (Cobertura), <a href="lcov.info">lcov.info</a>.</p>
<table>
<thead><tr><th>File</th><th class="n">Lines</th><th class="n">Covered</th></tr></thead>
<tbody>
${rows}
</tbody>
</table>`,
  );
}

export function reportsIndex(commit: string, date: string): string {
  return page(
    "Reports",
    `<h1>Reports</h1>
<p>Commit <code>${escapeHtml(commit)}</code>, published ${escapeHtml(date)}.</p>
<ul>
<li><a href="tests/unit.xml">Test results</a> (JUnit XML)</li>
<li><a href="coverage/">Coverage</a>, <a href="coverage/coverage.xml">coverage.xml</a> (Cobertura)</li>
</ul>`,
  );
}

if (import.meta.main) {
  const [outDir, commit, date] = process.argv.slice(2);
  if (!outDir || !commit || !date) {
    console.error("usage: build-reports.ts <outDir> <commit> <date>");
    process.exit(1);
  }
  const lcov = await Bun.file("coverage/lcov.info").text();
  await Bun.write(`${outDir}/coverage/index.html`, coverageIndex(parseLcov(lcov)));
  await Bun.write(`${outDir}/index.html`, reportsIndex(commit, date));
}
