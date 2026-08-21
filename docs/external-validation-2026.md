# External validation sequence — 2026

**Status:** Proposed  
**Date:** 21 August 2026

## Purpose

ActionSeam's next phase is external validation, not feature expansion.

The project already has an executable reference lab, known-bad controls, a `bring-your-runtime` path, external adapters and a strict claim model. The current question is whether an external developer/maintainer can reproduce and extend that model with low enough friction to create community value.

## Sequence

```text
P0 — external onboarding reproduction
        ↓
P1 — one LangChain JS v1 approval-binding experiment
        ↓
exact evidence + negative control
        ↓
external reproduction / maintainer signal
        ↓
choose next profile OR next target
        ↓
P2 — evaluate MCP transport target
```

Tracking:

- Issue #22 — external `bring-your-runtime` reproduction
- Issue #23 — LangChain JS v1 approval-binding experiment
- Issue #24 — MCP 2026-07-28 transport-target evaluation
- Issue #25 — public category wording validation

## First target — LangChain JS v1

The first new framework target should be a bounded LangChain JS v1 agent/human-in-the-loop/tool seam.

Why this target comes first:

- ActionSeam is currently Node/JavaScript;
- the target can be integrated without adding a cross-language bridge first;
- the v1 human-in-the-loop surface exposes explicit review decisions around tool execution;
- approval/action identity is already a shipped ActionSeam concern.

The exact packages and versions must be frozen at implementation time.

## First profile — one only

Start with:

`authority.approval-binding.v1`

The initial experiment must answer one question well rather than advertise a matrix prematurely:

> After authority is granted for a material action, does the action that reaches execution remain the action that was actually authorised?

Additional profiles are not inherited automatically. Evaluate them only when the target owns the mechanism and the required evidence is observable.

## Required experiment properties

A promoted external experiment must have:

- exact target/version/configuration identity;
- real public framework/action seam;
- synthetic/public data only;
- deterministic/model-independent behavior where practical;
- one shipped ActionSeam profile;
- meaningful negative control;
- evidence sufficient for the profile evaluator;
- explicit attribution between target behavior and ActionSeam scaffolding;
- reproducible commands;
- explicit exclusions.

## External reproduction gate

Before starting a second major framework adapter for discoverability alone, prefer evidence that the first path is useful outside the project author:

- non-founder reproduction;
- maintainer discussion;
- external contribution;
- upstream issue/fix;
- external CI integration;
- explicit request for another adapter/profile.

A concrete collaboration opportunity can justify an exception, but the exception should be documented.

## MCP boundary

MCP is a roadmap transport target, not ActionSeam's identity.

When evaluated, pin an exact MCP specification and SDK version and choose one small transport/invariant slice. Do not add broad MCP support claims or public topics before executable evidence exists.

## Category wording

`Agent Action Conformance` remains a working category, not a forced marketing rename.

Validate external comprehension before changing the canonical description. Candidate language is tracked in Issue #25.

## Package boundary

External validation does not authorize npm publication.

The source-level community preview remains the distribution model until the existing release-readiness gates define and prove a public install/API/CLI contract.

## Success signals

Prioritize:

- independent reproduction;
- external adapter/profile contribution;
- actionable maintainer discussion;
- upstream issue/fix supported by ActionSeam evidence;
- external CI use.

Treat stars, forks, watchers and page views as distribution telemetry, not evidence that the conformance model works.

## Stop / iterate signals

Iterate before expansion if:

- onboarding requires author intervention;
- an adapter must implement the invariant on behalf of the target;
- evidence required by the profile cannot be observed;
- maintainers cannot understand the claim boundary;
- adapter maintenance cost exceeds demonstrated external value.

## Claim boundary

The goal is not to answer:

> Is framework X safe?

The goal is to answer:

> Can this exact operational invariant be reproduced against this exact framework/version/configuration with inspectable evidence?