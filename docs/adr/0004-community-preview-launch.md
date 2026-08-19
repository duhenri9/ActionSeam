# ADR 0004 — Enter experimental community preview without package publication

- Status: Accepted
- Date: 2026-08-19

## Context

ActionSeam intentionally separated repository visibility from active community launch. The initial launch gate required more than a public clean-room reference subject: at least one real external adapter needed meaningful executable evidence, and the quickstart, CI, security, provenance, governance, contribution, and support boundaries needed to be stable enough for outside reproduction.

PR #3 satisfied the missing external-evidence gate by adding a real `@invokta/core@0.6.0` ActionTarget over direct `engine.invoke`, with exact-version installation, deterministic evidence, a known-bad differential control, and explicit ownership attribution. The resulting support state is `PARTIAL`, not a framework-wide compatibility or safety claim.

The root ActionSeam package is deliberately `private: true`. No publishing contract or stable package release has been designed or approved.

## Decision

ActionSeam enters **EXPERIMENTAL / community preview** as a source repository.

The community preview may be actively shared for:

- reproducing the reference profiles and counterexamples;
- reviewing evidence and attribution;
- proposing new profiles;
- implementing public clean-room runtime or action-target adapters;
- improving the Inspector, validators, documentation, threat model, and operator legibility.

This decision does **not** publish an npm package, create a stable API promise, certify production safety, or promote any external adapter beyond its evidence-backed support state.

## Evidence boundary at launch

At the time of this decision:

- the clean-room reference lab is executable;
- the deliberately unsafe known-bad subject demonstrates validator sensitivity;
- Invokta `@invokta/core@0.6.0` is `PARTIAL` for direct `engine.invoke` only;
- Invokta CLI, MCP stdio, MCP HTTP, and transport differential remain untested by ActionSeam;
- DeepSeek Harness remains `NOT_IMPLEMENTED`;
- all adapter claims remain scoped to exact versions, configurations, transports, profiles, and recorded evidence.

## Publication boundary

The root package remains `private: true` during community preview.

Any future package publication, stable release, registry distribution, compatibility promise, or release-support contract requires a separate ADR and release gate. Community preview must not be used as an implicit substitute for that decision.

## Consequences

- README and maturity documentation may describe the project as `EXPERIMENTAL / community preview`.
- Maintainers may actively invite outside testing and contributions.
- Evidence that invalidates a support claim must lower that claim or reopen the relevant gate; public history should record the correction rather than hide it.
- A broken quickstart, material provenance defect, material security-process gap, or invalid external-adapter evidence is sufficient reason to revert the launch state to pre-launch until repaired.
