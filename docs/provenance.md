# Provenance and clean-room policy

## Repository origin

`duhenri9/ActionSeam` was observed empty immediately before initialization on 19 August 2026. The first commit is:

`bef467a98e735f425396a5dc4dd68d8360ce1755`

The repository is not a fork, subtree, repository split, or mirror of a private WM3 codebase.

## Allowed sources

Public ActionSeam work may be informed by:

- public upstream APIs/documentation/repositories under compatible licenses;
- public standards and research;
- generic engineering/security knowledge;
- synthetic scenarios authored specifically for ActionSeam;
- original code written in this repository.

## Prohibited sources

Do not publish:

- private customer/tenant data;
- private prompts, evaluations, or credentials;
- private WM3 source copied, renamed, transpiled, or mechanically rewritten;
- sanitized real incidents presented as synthetic fixtures;
- undocumented third-party implementation material.

## Adapter provenance

Each external adapter directory must record:

- upstream repository/package;
- exact observed version/commit;
- license;
- public surfaces used;
- supported/unsupported profiles;
- last verification date.

Current records are under `adapters/deepseek-harness/` and `adapters/invokta/`.
