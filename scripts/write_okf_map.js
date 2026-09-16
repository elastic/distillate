/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * @typedef {{ id: string; type: string }} OkfNode
 * @typedef {{ from: string; to: string }} OkfEdge
 * @typedef {{ node_count: number; edge_count: number; isolated: number; nodes: OkfNode[]; edges: OkfEdge[] }} OkfGraph
 * @typedef {{ id: string; title: string; type: string }} OkfConcept
 * @typedef {{ concepts: OkfConcept[] }} OkfList
 */

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const bundle = '.okf/distillate';
const outputPath = resolve(root, 'docs/reference/okf-map.md');
const check = process.argv.includes('--check');

const runOkfJson = (command) =>
  execFileSync('okf', [command, bundle], {
    cwd: root,
    encoding: 'utf8',
  });

/** @type {OkfGraph} */
const graph = JSON.parse(runOkfJson('graph'));
/** @type {OkfList} */
const list = JSON.parse(runOkfJson('list'));

const titles = new Map(
  list.concepts.map((concept) => [concept.id, concept.title])
);

const nodeName = (id) => id.replace(/[^A-Za-z0-9_]/g, '_');
const nodeLabel = (id) => {
  const title = titles.get(id) ?? id;
  return title.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
};
const className = (type) => type.toLowerCase().replace(/[^a-z0-9]+/g, '');

const nodes = [...graph.nodes].sort((left, right) =>
  left.id.localeCompare(right.id)
);
const edges = [...graph.edges].sort((left, right) =>
  `${left.from}\0${left.to}`.localeCompare(`${right.from}\0${right.to}`)
);

const lines = [
  '---',
  'navigation_title: OKF map',
  'description: Generated map of the Distillate OKF concept graph.',
  '---',
  '',
  '# OKF map',
  '',
  'Generated from `.okf/distillate` by `pnpm okf:map`. Do not edit by hand.',
  '',
  `- Concepts: ${graph.node_count}`,
  `- Links: ${graph.edge_count}`,
  `- Isolated concepts: ${graph.isolated}`,
  '',
  '## Graph',
  '',
  '```mermaid',
  'flowchart LR',
  ...nodes.map(
    (node) =>
      `    ${nodeName(node.id)}["${nodeLabel(node.id)}"]:::${className(node.type)}`
  ),
  ...edges.map((edge) => `    ${nodeName(edge.from)} --> ${nodeName(edge.to)}`),
  '    classDef concept fill:#e7f5ff,stroke:#1971c2,color:#102a43',
  '    classDef entrypoint fill:#fff4e6,stroke:#e67700,color:#2d1600',
  '    classDef playbook fill:#ebfbee,stroke:#2b8a3e,color:#102a12',
  '    classDef reference fill:#f8f0fc,stroke:#9c36b5,color:#2b1033',
  '```',
  '',
  '## Concepts',
  '',
  ...nodes.map(
    (node) =>
      `- ${titles.get(node.id) ?? node.id} (${node.type}): \`${node.id}\``
  ),
  '',
].join('\n');

if (check) {
  const current = readFileSync(outputPath, 'utf8');
  if (current !== lines) {
    console.error(
      "OKF map is stale. Run 'pnpm okf:map' and commit docs/reference/okf-map.md."
    );
    process.exit(1);
  }
  console.log('OKF map is fresh.');
} else {
  writeFileSync(outputPath, lines);
  console.log('Wrote docs/reference/okf-map.md.');
}
