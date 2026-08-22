<!--
Maintainer note (not rendered): every badge here measures something real —
do not add one that reads "unknown".
-->

[![check](https://github.com/alrayyes/washy-washy-pdf/actions/workflows/check.yml/badge.svg?branch=main)](https://github.com/alrayyes/washy-washy-pdf/actions/workflows/check.yml)
[![Codecov](https://codecov.io/gh/alrayyes/washy-washy-pdf/graph/badge.svg)](https://codecov.io/gh/alrayyes/washy-washy-pdf)
[![release](https://github.com/alrayyes/washy-washy-pdf/actions/workflows/release.yml/badge.svg?branch=main)](https://github.com/alrayyes/washy-washy-pdf/actions/workflows/release.yml)
[![npm](https://img.shields.io/npm/v/@washy-washy/pdf)](https://www.npmjs.com/package/@washy-washy/pdf)
[![docs](https://github.com/alrayyes/washy-washy-pdf/actions/workflows/docs.yml/badge.svg?branch=main)](https://alrayyes.github.io/washy-washy-pdf/)
[![licence: GPL v3+](https://img.shields.io/badge/licence-GPL--3.0--or--later-blue.svg)](LICENSE)

# @washy-washy/pdf

The `@react-pdf/renderer` components that draw a laundry chart into a PDF —
the phone sheet, the print sheet, and the per-pile reference cards — plus the
layout-fitting logic that measures each one until it lands on exactly one
page. This is the rendering half of [washy-washy-cli](https://github.com/alrayyes/washy-washy-cli),
split out so it can be depended on without the CLI's Bun-specific tooling.
The data half — chart parsing, mixing rules, machine validation — is its
sibling package, [`@washy-washy/core`](https://github.com/alrayyes/washy-washy-sdk).

## Requirements

- [Bun](https://bun.sh) or Node, with React 19 available.
- A [`Machine`](https://github.com/alrayyes/washy-washy-sdk) describing the
  washer and iron the chart is drawn for — this package draws nothing without
  one.

## Installation

```sh
bun add @washy-washy/pdf @washy-washy/core react
```

## Usage

```tsx
import { renderPhone, renderPrint } from "@washy-washy/pdf";
import { resolve } from "@washy-washy/core";

const items = resolve(instructions); // Instruction[] -> ResolvedInstruction[]

const phone = await renderPhone(items, machine); // { pdf, height, attempts, dropped }
const print = await renderPrint(items, machine); // { pdf, dropped }
```

Both functions render repeatedly and bisect the page height (`renderPhone`)
or the table density (`renderPrint`) until the sheet fits on exactly one
page — see [CONTRIBUTING.md](CONTRIBUTING.md#gotchas) for why, and how far
each one can stretch before it gives up.

`dropped` lists the distinct characters the chart carried that this
package's Helvetica font can't render — usually empty. What has a WinAnsi
equivalent (curly quotes, `≈`, `✓`, an ellipsis) is transliterated
automatically; anything else is stripped and named here instead of just
vanishing from the PDF.

Every drawing function takes a `variant` — `"full"`, `"wash"`, or `"iron"` —
for the split sheets: the same chart with the iron's half or the machine's
half left out, for whichever room you're standing in.

`PhoneDocument`, `PrintDocument`, and `ReferenceDocument` are also exported
directly, for rendering with your own `@react-pdf/renderer` pipeline instead
of the bisecting helpers above.

The full API reference — every export, its signature, and a runnable
example — is generated with TypeDoc and published at
[`alrayyes.github.io/washy-washy-pdf`](https://alrayyes.github.io/washy-washy-pdf/).
`@washy-washy/core`'s own reference lives at
[`alrayyes.github.io/washy-washy-core`](https://alrayyes.github.io/washy-washy-core/).

## Contributing

Everything about working on this — the commands, the linters, the tests, the
git hooks and how a release is cut — is in
[CONTRIBUTING.md](CONTRIBUTING.md). Short version: `bun run check` before you
push, commit under [Conventional Commits](https://www.conventionalcommits.org/).

## Licence

GPL-3.0-or-later. Use it, change it, pass it on — but anything you distribute
that is built on it comes with the same freedom attached, source included.
