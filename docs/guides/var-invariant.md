---
navigation_title: Test the var invariant
description: Assert every var() in emitted CSS has a matching declaration.
---

# Test the var invariant

A compact payload that references `--missing` will look fine in development if the host app's sheet happens to declare it, then break in email or SVG. `@elastic/distillate/testing` scans CSS text and reports `var(...)` names that are never declared in the same string.

```ts
import {
  assertVarRefsHaveDeclarations,
  findVarRefViolations,
} from '@elastic/distillate/testing';

const css = distillery.renderStyles(collector);
assertVarRefsHaveDeclarations(css); // throws with surrounding context
```

`findVarRefViolations` returns `{ reference, context }[]` when the assertion should not throw.

The scanner is whitespace-tolerant (`var( --x )`) and ignores strings, comments, and function names that merely end in `var`. A BEM selector like `.button--active:hover` is not a declaration of `--active`.

This entry reaches no third-party package. Run it against both compact artifacts and readable stylesheets; the helper does not care which names you used.
