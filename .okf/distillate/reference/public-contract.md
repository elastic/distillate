---
type: Reference
title: Public contract
description: Identifier segments, readable-name collisions, stylis pin, interpolation.
tags: [distillate, contract]
status: stable
stale_after: 2027-03-11
generated: { by: claude-sonnet-4.6, at: 2026-09-11T19:21:00Z }
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
---

# Definition

- `prefix`, module names, handle-path keys, and `t.vars` group and key names must each match `[A-Za-z_][A-Za-z0-9_-]*`.[^idents]
- Readable class names are `${moduleName}-${path.join('-')}`. Readable custom properties are `--${prefix}-${path}` with `/` joined on `-` and a leading `vars/` stripped (`cssVarName`). Distinct authored paths that join to the same string throw at `createDistillery` or `registerModule`.[^names]
- Theme-tree keys must match `/^[A-Za-z_][A-Za-z0-9_]*$/`. Hyphens are rejected so path segments reverse uniquely.
- Nested `css` templates walk stylis `compile()` output pinned at **4.4.0**. `nesting_contract.test.ts` asserts the tree shape.[^nesting-contract]
- Template interpolations are spliced into CSS verbatim. Never bind authored CSS to untrusted input.
- Exactly one copy of the package may load. See [single-copy invariant](/concepts/single-copy.md).

[^idents]: CSS identifier-segment check

[^names]: cssVarName

[^nesting-contract]: stylis 4.4.0 tree-shape assertions
