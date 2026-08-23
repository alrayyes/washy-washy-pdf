## [2.3.0](https://github.com/alrayyes/washy-washy-pdf/compare/v2.2.0...v2.3.0) (2026-08-23)

### Features

* render a chart row's reference citation on its card ([#45](https://github.com/alrayyes/washy-washy-pdf/issues/45)) ([89bf4a8](https://github.com/alrayyes/washy-washy-pdf/commit/89bf4a8b5d2836e34b0177efd4da70c3df9b1c98)), closes [#30](https://github.com/alrayyes/washy-washy-pdf/issues/30)

## [2.2.0](https://github.com/alrayyes/washy-washy-pdf/compare/v2.1.0...v2.2.0) (2026-08-23)

### Features

* explain what a bold pile name means in the Loads table ([#44](https://github.com/alrayyes/washy-washy-pdf/issues/44)) ([80cf25b](https://github.com/alrayyes/washy-washy-pdf/commit/80cf25b2022d6038854de939618f6a50be3c636a)), closes [#25](https://github.com/alrayyes/washy-washy-pdf/issues/25)

## [2.1.0](https://github.com/alrayyes/washy-washy-pdf/compare/v2.0.2...v2.1.0) (2026-08-23)

### Features

* a real single-pile card document ([#42](https://github.com/alrayyes/washy-washy-pdf/issues/42)) ([e4f5632](https://github.com/alrayyes/washy-washy-pdf/commit/e4f5632c002127094ff1b8b37e4b13bbdeb79a30)), closes [#29](https://github.com/alrayyes/washy-washy-pdf/issues/29) [#36](https://github.com/alrayyes/washy-washy-pdf/issues/36) [#31](https://github.com/alrayyes/washy-washy-pdf/issues/31) [#14](https://github.com/alrayyes/washy-washy-pdf/issues/14)

## [2.0.2](https://github.com/alrayyes/washy-washy-pdf/compare/v2.0.1...v2.0.2) (2026-08-23)

### Bug Fixes

* **ci:** don't regenerate PDFs in the release screenshot step ([#40](https://github.com/alrayyes/washy-washy-pdf/issues/40)) ([7b7038d](https://github.com/alrayyes/washy-washy-pdf/commit/7b7038d0927bdc9d97fab9c0e8beb96dc6dc0d6f))

## [2.0.1](https://github.com/alrayyes/washy-washy-pdf/compare/v2.0.0...v2.0.1) (2026-08-22)

### Bug Fixes

* legend row can no longer split, leaving a near-blank reference-sheet page 2 ([#35](https://github.com/alrayyes/washy-washy-pdf/issues/35)) ([ba6b505](https://github.com/alrayyes/washy-washy-pdf/commit/ba6b5050c685c05545fc7d876c1e92672e88dab4)), closes [#26](https://github.com/alrayyes/washy-washy-pdf/issues/26) [washy-washy-cli#128](https://github.com/alrayyes/washy-washy-cli/issues/128) [#34](https://github.com/alrayyes/washy-washy-pdf/issues/34) [#26](https://github.com/alrayyes/washy-washy-pdf/issues/26)

## [2.0.0](https://github.com/alrayyes/washy-washy-pdf/compare/v1.1.1...v2.0.0) (2026-08-22)

### ⚠ BREAKING CHANGES

* renderPrint now returns { pdf, dropped } instead of a
bare Uint8Array, matching the shape renderPhone/renderCard already use
(both gain a dropped field too). This is the only way to satisfy the
ticket's requirement that dropped characters come back through the
render result itself, not a separate opt-in step a caller could forget
to call. Every renderPrint call site in this repo's own tests updated
to destructure .pdf.

### Bug Fixes

* transliterate or report non-WinAnsi characters instead of dropping them silently ([#31](https://github.com/alrayyes/washy-washy-pdf/issues/31)) ([a07756f](https://github.com/alrayyes/washy-washy-pdf/commit/a07756f312ee254bf9b8f46293e65e3dbad0534b)), closes [#16](https://github.com/alrayyes/washy-washy-pdf/issues/16)

## [1.1.1](https://github.com/alrayyes/washy-washy-pdf/compare/v1.1.0...v1.1.1) (2026-08-22)

### Bug Fixes

* unbounded overflow — unwrappable tall cards, ever-narrowing matrix cells, clipping labels ([#27](https://github.com/alrayyes/washy-washy-pdf/issues/27)) ([4d6e957](https://github.com/alrayyes/washy-washy-pdf/commit/4d6e9570f62d9267ad3904221fe72ae077e3bfba)), closes [#17](https://github.com/alrayyes/washy-washy-pdf/issues/17)

## [1.1.0](https://github.com/alrayyes/washy-washy-pdf/compare/v1.0.4...v1.1.0) (2026-08-22)

### Features

* page numbers, running header, and fuller metadata on the print sheets ([#24](https://github.com/alrayyes/washy-washy-pdf/issues/24)) ([b8b66af](https://github.com/alrayyes/washy-washy-pdf/commit/b8b66af12681aeab93e95033264433d3b233f31f)), closes [#13](https://github.com/alrayyes/washy-washy-pdf/issues/13)

## [1.0.4](https://github.com/alrayyes/washy-washy-pdf/compare/v1.0.3...v1.0.4) (2026-08-22)

### Bug Fixes

* floor the reference sheet's density-scaled type, scale the grid instead ([#23](https://github.com/alrayyes/washy-washy-pdf/issues/23)) ([30d2cfc](https://github.com/alrayyes/washy-washy-pdf/commit/30d2cfcbe63d4fb32a2b5d5775a89f6d7b377b0f)), closes [#12](https://github.com/alrayyes/washy-washy-pdf/issues/12)

## [1.0.3](https://github.com/alrayyes/washy-washy-pdf/compare/v1.0.2...v1.0.3) (2026-08-22)

### Bug Fixes

* swap the mix matrix's emphasis so blockers outweigh OK ([0b4c1b4](https://github.com/alrayyes/washy-washy-pdf/commit/0b4c1b4f584fcee3f6b62af5e0913e9ed8b0f649)), closes [#11](https://github.com/alrayyes/washy-washy-pdf/issues/11)

## [1.0.2](https://github.com/alrayyes/washy-washy-pdf/compare/v1.0.1...v1.0.2) (2026-08-22)

### Bug Fixes

* enforce the reference table's column-width budget ([cd2075d](https://github.com/alrayyes/washy-washy-pdf/commit/cd2075d5bbb9216f1a7556fcb4f28141847540f8)), closes [#15](https://github.com/alrayyes/washy-washy-pdf/issues/15)

## [1.0.1](https://github.com/alrayyes/washy-washy-pdf/compare/v1.0.0...v1.0.1) (2026-08-22)

### Bug Fixes

* cards print the machine's own word for a cold wash, not 'koud' ([f35943b](https://github.com/alrayyes/washy-washy-pdf/commit/f35943b9e764d79f4671e9eb64aa8a2ecca83862)), closes [#10](https://github.com/alrayyes/washy-washy-pdf/issues/10)

## 1.0.0 (2026-08-22)

### Features

* import PDF rendering components and layout-fitting logic ([737bc95](https://github.com/alrayyes/washy-washy-pdf/commit/737bc95c9dc962afe90d5da85487683b75c23005)), closes [#1](https://github.com/alrayyes/washy-washy-pdf/issues/1)

### Bug Fixes

* set package.json repository.url for npm provenance verification ([#5](https://github.com/alrayyes/washy-washy-pdf/issues/5)) ([69c8119](https://github.com/alrayyes/washy-washy-pdf/commit/69c811910a1146641c02c1f4d288af80d7441fa9))

## 1.0.0 (2026-08-22)

### Features

* import PDF rendering components and layout-fitting logic ([737bc95](https://github.com/alrayyes/washy-washy-pdf/commit/737bc95c9dc962afe90d5da85487683b75c23005)), closes [#1](https://github.com/alrayyes/washy-washy-pdf/issues/1)
