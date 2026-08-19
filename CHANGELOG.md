# Changelog

All notable ActionSeam changes will be recorded here.

## Unreleased

### Added

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

- Invokta verification now explicitly selects the eleven profiles it previously homologated, so later additions to the global ActionSeam profile catalog cannot silently expand the Invokta support claim.

## 0.0.0-experimental — 2026-08-19

Repository initialized with fresh public history under Apache-2.0.
