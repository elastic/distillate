---
type: Concept
title: Naming and output
description: Artifact versus stylesheet targets, compact versus readable names.
resource: https://github.com/elastic/distillate/blob/main/src/names.ts
tags: [distillate, naming, output]
status: stable
stale_after: 2027-03-11
generated: { by: anthropic/claude-sonnet-4.6, at: 2026-09-11T19:21:00Z }
sources:
  - id: names
    resource: https://github.com/elastic/distillate/blob/main/src/names.ts
    title: cssVarName and StyleNameResolver
  - id: examples
    resource: https://github.com/elastic/distillate/blob/main/docs/examples/02-artifact.ts
    title: Compact artifact example
---

# Definition

Target (`artifact` | `stylesheet`) is how much CSS ships. Name mode (`readable` | `compact`) is how classes and custom properties are spelled.[^names]

Readable classes are `${moduleName}-${path}`. Readable custom properties are `cssVarName(prefix, path)`: `--${prefix}-${path}` with `/` joined on `-` and a leading `vars/` stripped. Compact classes are `a`, `b`, … assigned from sorted keys. Compact names are not stable across different collected sets; HTML and CSS must come from the same collector.

`createDistillery` throws if a theme-tree key contains a hyphen, if a `lightDark` value is not a CSS `<color>`, if a named theme disagrees with the base, or if two paths hyphenate to the same property.

`renderStyles` may select a declared theme (`{ theme }`) or emit overlay diffs (`{ alternates }`). See [the distillery](/concepts/distillery.md).

# Examples

```ts
const collector = distillery.artifactCollector('compact');
collector.use(demo.handles.root);
distillery.renderStyles(collector);
// .eui-view{--a:light-dark(#111,#eee)}.a{color:var(--a);padding:8px}
```

Asserted in the compact artifact example.[^examples] Playbook: [ship an artifact](/playbooks/ship-an-artifact.md).

[^names]: cssVarName and StyleNameResolver

[^examples]: Compact artifact example
