# Contributing

The [README](README.md) is for whoever installs this package. This file is for
whoever changes it.

This package draws the PDFs `washy-washy-cli` generates, and the web app
previews — the `@react-pdf/renderer` components and the layout-fitting logic,
split out so either can depend on just the rendering layer.

## Getting set up

```sh
bun install --frozen-lockfile
bun run prose:sync      # fetches Vale and its style packages into .tools/
```

`bun install` puts the git hooks in place: lefthook is pinned like every other
tool here and the `prepare` script runs `lefthook install`, so there's no step
to forget and no clone that quietly has no hooks. `prose:sync` is separate
because Vale is a Go binary rather than a package — it checks the release
against its own checksums, and it wants network access and `tar`, once.

`@washy-washy/core` is this package's one dependency, and until it has its own
first npm release, `bun install` here resolves it against whatever range is
currently pinned in `package.json` — which may be a placeholder. Point it at a
local checkout with `bun link` while developing against unpublished core
changes.

## The commands

```sh
bun run check              # every linter, tsc --noEmit, then the tests
bun run build              # tsdown, producing dist/index.{js,d.ts}
bun run format             # let Prettier lay the Markdown and YAML out
bun run lint:prose:advice  # Vale's style advice, warnings and all
bun test                   # just the tests
```

Two formatters, split by file type and never overlapping. Biome owns
everything it supports; Markdown and YAML are what it does not format, so
those go to Prettier and `.prettierignore` names the file types Prettier must
keep its hands off. Prettier runs before markdownlint, never after — Prettier
decides the layout and markdownlint judges what came out, so the rules the two
would argue over (list markers, list indentation, emphasis characters) are
switched off on markdownlint's side. Nothing judges the YAML after Prettier
has laid it out, so `lint:yaml` is the check on its own.

## The prose is linted too

The README is the whole manual for this thing, so it gets checked the way the
code does. markdownlint only judges structure — headings, list markers, blank
lines — and happily passes a document that says `an unique setting`. Two more
tiers sit over it, and they are deliberately answered differently. The
specimen in the last sentence is in backticks because otherwise the mechanics
tier finds it, which is the point:

- **Mechanics** — [LTeX+](https://github.com/ltex-plus/ltex-ls-plus) wrapping
  LanguageTool: grammar, spelling, punctuation, the phonetic article. These
  have a right answer, so the `ltex` job blocks the run. It reports findings
  with exit code **3**, not 1, which is worth knowing before you write anything
  that tests for a number. It stays out of the git hooks because it is a 300 MB
  download carrying its own Java runtime; cache the archive under
  `$XDG_CACHE_HOME` and run it yourself before pushing, since it's the one
  check here that no hook covers.
- **Style** — [Vale](https://vale.sh) with the Google and proselint packages:
  house voice, wordiness, clichés. This is advice, and Vale exits non-zero
  only on error-severity alerts, so its warnings are reported without
  blocking. It is fast, so the commit hook runs it too, but only at error
  level. It arrives through `scripts/install-vale.ts` rather than the
  `@vvago/vale` npm package: that package downloads its binary from a
  postinstall that shells out to `node`, a Bun runner has no Node, so it
  installs an empty `bin/` and says nothing until the linter is called, and
  the shell answers 127.

`.vale.ini` and `.ltex.json` each say why a rule was turned off. The short
version: spelling belongs to LTeX alone, because two tools underlining the
same word is how you learn to ignore both, and the em dashes and missing
serial commas here are house style rather than mistakes. Product names and
tooling terms go in the dictionaries —
`styles/config/vocabularies/House/accept.txt` and the `dictionary` block in
`.ltex.json` — never in an ignore comment buried in the prose.

## Tests

`test/render.test.ts` renders against a self-contained fixture machine — no
CLI, no `data/` directory, nothing this package can't build from a literal —
and checks that the reference sheet stays on one page as more piles are
added, rather than silently coming back nearly blank when the content
overflows.

## The git hooks

`lefthook.yml` runs the same commands CI does, so the two cannot drift. On
commit, Biome, Prettier and markdownlint fix what they can over the staged
files and restage it, Vale checks the prose for errors, and commitlint reads
the message. On push, every linter runs again in check mode over the whole
tree, followed by the typecheck and the tests — nothing at that point writes,
so the commit you push is the one you reviewed.

Every hook is skippable with `--no-verify`, which is why CI checks the same
things again and why the message check runs a second time over the whole
range of a pull request. These messages decide the version a release tool
picks, so they are worth a gate rather than only a reminder.

## Gotchas

- Only Helvetica is embedded, so the PDFs can only render WinAnsi characters.
  `•`, `°`, `—`, `–` are fine; `≈`, `✓` and curly quotes vanish silently.
- The phone page's height is _measured_, not chosen: `renderPhone` renders the
  document repeatedly and bisects until it fits on one page with under 8 pt to
  spare. That is why the return value reports a number of layout passes.
- The reference sheet is measured the same way, in the other direction. Its
  page size is fixed at A4, so what gives is the type: `renderPrint` renders
  the sheet on its own and bisects the size of the two tables down until it
  comes back one page. Adding piles sets them tighter rather than spilling
  onto a second sheet, and past roughly thirty the run stops with an error
  instead.

## Pull requests

Branch, commit under
[Conventional Commits](https://www.conventionalcommits.org/), open a pull
request. Run `bun run check` first.

Those commit subjects are not decoration: semantic-release reads them when a
pull request lands to decide the next version. `feat:` takes the minor,
`fix:` the patch, a `BREAKING CHANGE:` footer the major, and a branch of
nothing but `docs:` and `chore:` releases nothing at all.

**The pull request title matters as much as the commits.** Merges here are
squashes, so the title is what lands on `main` and the branch commits become
the body. Give it the same Conventional Commit subject you would give the
commit, or semantic-release reads a subject with no type, finds nothing
releasable and skips the version without failing.

The `pr-title` job holds you to it, running the same commitlint and the same
config the `commits` job uses. It has a workflow of its own because it
re-runs on `edited`, so retitling rechecks the pull request.

One change per pull request. If the title needs an "and", it is two.

### Labels

Every issue and pull request takes two:

- `kind/feature`, `kind/bug`, `kind/chore`, `kind/docs` — what it is.
- `topic/packaging`, plus whatever else earns its place as the codebase
  grows.

Reach for an existing one before inventing a label. A taxonomy grown a ticket
at a time is a filter nobody can use.

## Releasing

Nobody picks a version. When a pull request lands on `main` and the checks
pass, semantic-release reads the Conventional Commits that arrived with it,
tags, writes `CHANGELOG.md`, publishes `@washy-washy/pdf` to npm with
provenance, and writes the GitHub release.

npm publishing uses [Trusted Publishing](https://docs.npmjs.com/trusted-publishers)
(OIDC) rather than a stored token: the release job asks npm for a short-lived
credential using its own GitHub Actions identity, which npm accepts because
this repository and workflow file are linked as a trusted publisher on
npmjs.com. Nothing to rotate, nothing to leak.

The GitHub side still needs one secret, `RELEASE_TOKEN`: a fine-grained
personal access token scoped to this repository with **contents: read and
write**, saved under Settings → Secrets and variables → Actions. The job
token that Actions hands out by default is not enough — `main` requires
status checks, a ruleset applies those to a direct push as well as to a pull
request, and the changelog commit is a direct push from `github-actions[bot]`
carrying no checks of its own, so it is rejected. A token belonging to
someone the ruleset lets bypass is what gets it in.

Until both of those exist the release job reports that it did nothing and
stops. It does not fail: nothing is broken, there is just no token, and a
release badge stuck on red would be saying otherwise.

One wrinkle worth knowing if you touch that workflow. semantic-release checks
the runtime version at startup and refuses anything outside
`^22.14 || >=24.10`, and Bun answers `process.version` with the Node version
it implements, so `bunx --bun semantic-release` dies on the version gate
before doing anything at all. Bun installs it and Node runs it.

`CHANGELOG.md` is written by that job, and Prettier, markdownlint and Vale
are all told to leave it alone. Its bullets are the generator's; reformatting
them by hand only lasts until the next release.

That job pushes with `LEFTHOOK=0`. The hooks install themselves on
`bun install`, so they land there too, and its push would otherwise fire a
`pre-push` that went looking for a Vale it had never downloaded — failing the
release over the tooling rather than the prose. Whatever that hook would have
checked already ran on that exact commit, and it is the green run that starts
the release in the first place.
