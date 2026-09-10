---
navigation_title: OKF map
description: Generated map of the Distillate OKF concept graph.
---

# OKF map

Generated from `.okf/distillate` by `pnpm okf:map`. Do not edit by hand.

- Concepts: 18
- Links: 27
- Isolated concepts: 0

## Graph

```mermaid
flowchart LR
    concepts_authoring["Authoring"]:::concept
    concepts_collection["Reachability collection"]:::concept
    concepts_distillery["The distillery"]:::concept
    concepts_naming["Naming and output"]:::concept
    concepts_ordering["Ordering"]:::concept
    concepts_single_copy["Single-copy invariant"]:::concept
    concepts_tokens["Tokens and vars"]:::concept
    entry_points_emotion["Emotion"]:::entrypoint
    entry_points_root["Root"]:::entrypoint
    entry_points_testing["Testing"]:::entrypoint
    playbooks_bind_a_library["Bind a library"]:::playbook
    playbooks_maintain_okf["Maintain OKF"]:::playbook
    playbooks_migrate_from_emotion["Migrate from Emotion"]:::playbook
    playbooks_ship_an_artifact["Ship an artifact"]:::playbook
    playbooks_use_the_playground["Use the playground"]:::playbook
    playbooks_vs_emotion["Distillate vs CSS-in-JS"]:::playbook
    reference_glossary["Glossary"]:::reference
    reference_public_contract["Public contract"]:::reference
    concepts_authoring --> concepts_collection
    concepts_authoring --> concepts_tokens
    concepts_authoring --> playbooks_use_the_playground
    concepts_distillery --> playbooks_bind_a_library
    concepts_naming --> concepts_distillery
    concepts_naming --> playbooks_ship_an_artifact
    concepts_ordering --> concepts_authoring
    concepts_ordering --> concepts_naming
    concepts_tokens --> concepts_distillery
    concepts_tokens --> reference_public_contract
    entry_points_emotion --> playbooks_migrate_from_emotion
    entry_points_root --> entry_points_emotion
    entry_points_root --> entry_points_testing
    playbooks_bind_a_library --> concepts_distillery
    playbooks_maintain_okf --> entry_points_root
    playbooks_maintain_okf --> reference_public_contract
    playbooks_migrate_from_emotion --> entry_points_emotion
    playbooks_migrate_from_emotion --> playbooks_bind_a_library
    playbooks_ship_an_artifact --> concepts_naming
    playbooks_use_the_playground --> concepts_authoring
    playbooks_use_the_playground --> concepts_tokens
    playbooks_use_the_playground --> playbooks_ship_an_artifact
    playbooks_vs_emotion --> concepts_single_copy
    playbooks_vs_emotion --> playbooks_migrate_from_emotion
    reference_glossary --> concepts_distillery
    reference_glossary --> reference_public_contract
    reference_public_contract --> concepts_single_copy
    classDef concept fill:#e7f5ff,stroke:#1971c2,color:#102a43
    classDef entrypoint fill:#fff4e6,stroke:#e67700,color:#2d1600
    classDef playbook fill:#ebfbee,stroke:#2b8a3e,color:#102a12
    classDef reference fill:#f8f0fc,stroke:#9c36b5,color:#2b1033
```

## Concepts

- Authoring (Concept): `concepts/authoring`
- Reachability collection (Concept): `concepts/collection`
- The distillery (Concept): `concepts/distillery`
- Naming and output (Concept): `concepts/naming`
- Ordering (Concept): `concepts/ordering`
- Single-copy invariant (Concept): `concepts/single-copy`
- Tokens and vars (Concept): `concepts/tokens`
- Emotion (Entry Point): `entry-points/emotion`
- Root (Entry Point): `entry-points/root`
- Testing (Entry Point): `entry-points/testing`
- Bind a library (Playbook): `playbooks/bind-a-library`
- Maintain OKF (Playbook): `playbooks/maintain-okf`
- Migrate from Emotion (Playbook): `playbooks/migrate-from-emotion`
- Ship an artifact (Playbook): `playbooks/ship-an-artifact`
- Use the playground (Playbook): `playbooks/use-the-playground`
- Distillate vs CSS-in-JS (Playbook): `playbooks/vs-emotion`
- Glossary (Reference): `reference/glossary`
- Public contract (Reference): `reference/public-contract`
