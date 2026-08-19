# Changelog

All notable ActionSeam changes will be recorded here.

## Unreleased

### Added

- executable “bring your runtime” onboarding that runs one shipped profile against a source-level candidate runtime seam and a deliberately broken negative control, plus a promotion guide for turning that experiment into a bounded evidence-backed adapter claim;
- source-level runnable examples for the reference suite, a deliberately failing known-bad profile, local profile authoring, report inspection, and adapter provenance inspection, all executed by CI as public onboarding paths where practical;
- explicit package/release-readiness gates that keep the root package at `0.0.0-experimental` and `private: true` until a stable public contract, release integrity evidence, and a dedicated publication ADR exist;
- real DeepSeek Harness ACP `session/cancel` pre-tool-dispatch differential over the published `@deepseek-ai/dsh-acp@0.1.0-rc.7` bridge and official ACP SDK, proving model-abort propagation, `cancelled` prompt settlement, zero tool/effect execution, frozen dependencies, and a synthetic post-cancel tool/effect negative control;
- real DeepSeek Harness ACP `session/request_permission` one-shot allow/reject differential over the published `@deepseek-ai/dsh-acp@0.1.0-rc.7` bridge and official ACP SDK, with exact session/tool-call identity, effect/no-effect semantics, frozen dependencies, and an inverted-effect negative control;
- real DeepSeek Harness `@deepseek-ai/dsh-acp@0.1.0-rc.7` JSON-RPC stdio transport differential over a real child-process boundary using official `@agentclientprotocol/sdk@0.25.1`, frozen in an isolated lockfile with direct-vs-ACP semantic comparison and a corrupted-effect negative control;
- generic `authority.approval-one-shot.v1` and `contracts.argument-immutability.v1` conformance profiles, each with conforming reference behavior and deliberately failing known-bad counterexamples;
- expanded DeepSeek Harness `0.1.0-rc.7` RuntimeTarget evidence from five to seven explicitly attributable profiles, including the real published one-shot approval lifecycle and ToolRuntime immutable-argument boundary;
- real DeepSeek Harness `0.1.0-rc.7` direct Agent-spine RuntimeTarget verification with frozen published dependencies, real AgentLoop/tool-round-trip evidence, ToolRuntime boundary probes, and differential matrices;
- experimental source-repository community preview launch decision in ADR 0004, explicitly separate from package publication;
- real `@invokta/core@0.6.0` direct ActionTarget verification with differential evidence and frozen adapter lockfile;
- clean-room reference runtime/action target;
- deterministic synthetic external state and fault injection;
- thirteen experimental conformance profiles;
- five-state result model;
- evidence-backed conformance reports;
- reproducible counterexamples;
- static Inspector;
- repository validation and tests;
- public provenance records and evidence-backed adapter status for DeepSeek Harness and Invokta;
- initial project/security/governance/contribution documentation.

### Changed

- GitHub Actions dependencies are pinned to immutable full commits for the current Node 24-compatible official checkout, setup-node, and artifact-upload releases while ActionSeam's tested runtime remains Node.js 22;
- repository validation now guards the executable runtime-onboarding path, its claim-promotion guide, immutable CI Action pins, and the promoted ACP `session/cancel` documentation boundary against regression;
- ACP adapter documentation now consistently records three evidenced stdio slices and points cancellation regression evidence to the final reviewed gate rather than an earlier intermediate run;
- root README now prioritizes project purpose, evidence discipline, a sub-minute source quickstart, current verified target scope, security posture, and clear navigation before low-level evidence detail;
- repository validation treats the experimental private-package boundary, release-readiness policy, public examples, and current ACP cancellation scope as required public-surface invariants;
- DeepSeek Harness transport evidence separately records three ACP stdio slices: the baseline semantic differential, one-shot permission allow/reject, and pre-tool-dispatch `session/cancel`; none implies all seven runtime profiles were executed over ACP or that cancellation can roll back work that already started or committed;
- Invokta verification explicitly selects the eleven profiles it previously homologated, so later additions to the global ActionSeam profile catalog cannot silently expand the Invokta support claim.

## 0.0.0-experimental — 2026-08-19

Repository initialized with fresh public history under Apache-2.0.
