# Security Policy

This package draws a PDF from data you already have in memory. It reads no
files, runs no server, opens no socket, and sends nothing anywhere on its
own.

That said, it does run content you did not write through a PDF renderer
(`@react-pdf/renderer`) and a PDF library (`pdf-lib`), and it downloads
pinned tooling over the network at install and lint time.

## Reporting a Vulnerability

Please report security vulnerabilities privately using [GitHub's private
vulnerability reporting](../../security/advisories/new) — not a public
issue.

Include reproduction steps and affected versions. Expect an initial response
within 5 business days.

## Supported Versions

Only the latest published version is supported. There is no release old
enough to need a backport.
