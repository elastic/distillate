---
type: Entry Point
title: Testing
description: '@elastic/distillate/testing var-invariant helpers. No stylis import.'
resource: https://github.com/elastic/distillate/blob/main/src/testing.ts
tags: [distillate, testing, api]
status: stable
stale_after: 2027-03-11
generated: { by: anthropic/claude-sonnet-4.6, at: 2026-09-11T19:21:00Z }
sources:
  - id: testing
    resource: https://github.com/elastic/distillate/blob/main/src/testing.ts
    title: testing barrel
  - id: invariant
    resource: https://github.com/elastic/distillate/blob/main/src/var_invariant.ts
    title: var() declaration scanner
---

# Definition

`assertVarRefsHaveDeclarations(css)` throws when a `var(...)` has no matching custom-property declaration in the same text. `findVarRefViolations` returns `{ reference, context }[]`. `tokenTreeDts(typeName, tree)` emits a TypeScript `interface` for a derived token tree.[^testing]

Whitespace-tolerant. Ignores strings, comments, and function names that merely end in `var`. A BEM selector is not a declaration.[^invariant] This entry reaches no third-party package.

[^testing]: testing barrel

[^invariant]: var() declaration scanner
