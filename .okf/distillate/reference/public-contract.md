---
type: Reference
title: Public contract
description: Identifier segments, readable-name collisions, stylis pin, interpolation, package contract.
tags: [distillate, contract]
status: stable
stale_after: 2027-03-11
generated: { by: anthropic/claude-sonnet-4.6, at: 2026-09-11T19:21:00Z }
sources:
  - id: idents
    resource: https://github.com/elastic/distillate/blob/main/src/idents.ts
    title: CSS identifier-segment check
  - id: names
    resource: https://github.com/elastic/distillate/blob/main/src/names.ts
    title: cssVarName
  - id: nesting-contract
    resource: https://github.com/elastic/distillate/blob/main/src/nesting_contract.test.ts
    title: stylis 4.4.0 tree-shape assertions
  - id: package
    resource: https://github.com/elastic/distillate/blob/main/package.json
    title: Package metadata, files, engines, and package manager
  - id: release-workflow
    resource: https://github.com/elastic/distillate/blob/main/.github/workflows/release.yml
    title: Release workflow authentication and verification
  - id: post-release
    resource: https://github.com/elastic/distillate/blob/main/.github/post-release.md
    title: Release prerequisites and supported install contract
---

# Definition

- `prefix`, module names, handle-path keys, and `t.vars` group and key names must each match `[A-Za-z_][A-Za-z0-9_-]*`.[^idents]
- Readable class names are `${moduleName}-${path.join('-')}`. Readable custom properties are `--${prefix}-${path}` with `/` joined on `-` and a leading `vars/` stripped (`cssVarName`). Distinct authored paths that join to the same string throw at `createDistillery` or `registerModule`.[^names]
- Theme-tree keys must match `/^[A-Za-z_][A-Za-z0-9_]*$/`. Hyphens are rejected so path segments reverse uniquely.
- Nested `css` templates walk stylis `compile()` output pinned at **4.4.0**. `nesting_contract.test.ts` asserts the tree shape.[^nesting-contract]
- Template interpolations are spliced into CSS verbatim. Never bind authored CSS to untrusted input.
- Exactly one copy of the package may load. See [single-copy invariant](/concepts/single-copy.md).
- Published package metadata uses `license: "Elastic-2.0"`, ships `LICENSE.txt`, `NOTICE.txt`, and `THIRD_PARTY_LICENSES.md`, and targets Node `>=20`.[^package]
- The supported consumer install contract is `npm install @elastic/distillate` from `registry.npmjs.org`.[^package][^post-release]
- Release publishing runs only from `.github/workflows/release.yml`, verifies with `pnpm verify`, and authenticates to npm via OIDC trusted publishing (`id-token: write`).[^release-workflow][^post-release]

[^idents]: CSS identifier-segment check

[^names]: cssVarName

[^nesting-contract]: stylis 4.4.0 tree-shape assertions

[^package]: Package metadata, files, engines, and package manager

[^release-workflow]: Release workflow authentication and verification

[^post-release]: Release prerequisites and supported install contract
