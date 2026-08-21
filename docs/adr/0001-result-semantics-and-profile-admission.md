# ADR 0001 — Result semantics and profile admission

**Status:** Proposed  
**Date:** 21 August 2026  
**Decision scope:** ActionSeam profile results, profile admission and external-support attribution

## Context

ActionSeam exists to make narrow operational claims harder to overstate and easier to reproduce. That depends on keeping three things distinct:

1. the outcome of one profile execution;
2. the lifecycle of the profile definition itself;
3. the coverage/support state of an external adapter or framework target.

Collapsing those layers creates ambiguous claims. In particular, a partially supported adapter must not manufacture a `PARTIAL_PASS`, an old profile must not return `DEPRECATED` as an execution outcome, and incomplete evidence must not be promoted to a pass.

## Decision

### Profile execution result vocabulary is closed for the current contract

A profile execution returns exactly one of:

```text
PASS
FAIL
UNSUPPORTED
NOT_TESTED
INDETERMINATE
```

Meanings:

- `PASS` — the evidence required by the exact profile was available and satisfied the invariant.
- `FAIL` — available evidence demonstrates a violation of the invariant.
- `UNSUPPORTED` — the subject/adapter cannot provide a mechanism, control or observation required to execute the profile as defined.
- `NOT_TESTED` — the profile was not executed for that exact subject/configuration.
- `INDETERMINATE` — execution occurred, but evidence is missing, contradictory or otherwise insufficient to justify `PASS` or `FAIL`.

### No `PARTIAL_PASS`

`PARTIAL_PASS` is intentionally rejected as a profile-result state.

If only part of an intended property can be evidenced, one of the following is true:

- the profile is too broad and should be decomposed into smaller falsifiable invariants;
- required evidence is unavailable, producing `INDETERMINATE`;
- the target cannot expose the required mechanism/observation, producing `UNSUPPORTED`;
- some profiles were never run, producing `NOT_TESTED` for those profiles.

Partial coverage belongs at the **adapter/support-scope layer**, not inside one profile result.

Example:

```text
DeepSeek Harness support: PARTIAL
  profile A: PASS
  profile B: PASS
  profile C: UNSUPPORTED
  profile D: NOT_TESTED
```

`PARTIAL` describes the bounded support surface. It does not replace the result of any individual profile.

### `DEPRECATED` is lifecycle metadata, not an execution result

A profile may eventually become obsolete or be replaced by a newer definition. That state belongs to profile metadata, for example:

```text
lifecycle: active | deprecated | superseded
supersededBy: <profile-id>
```

No profile-lifecycle schema expansion is authorised by this ADR until an actual lifecycle case requires it.

### Good/bad differential is required for profile promotion

A new profile must demonstrate both:

```text
conforming/reference mechanism
→ expected PASS

meaningfully broken mechanism
→ expected FAIL with a useful counterexample
```

The negative control must remove or corrupt the mechanism the profile claims to test. An unrelated failure is not sufficient.

A profile that only passes a conforming subject is not ready for promotion into the shipped corpus.

### External support remains exact and attributable

External support claims must remain scoped to the exact:

- profile id/version;
- subject repository/package;
- subject version/commit;
- relevant configuration;
- transport/action target where applicable;
- accepted evidence;
- explicit exclusions.

An adapter must not implement the invariant itself and then attribute the resulting `PASS` to the upstream subject.

## Consequences

### Positive

- missing evidence remains visible instead of becoming optimistic success;
- external support coverage can be partial without weakening profile semantics;
- profiles are encouraged to stay small and falsifiable;
- future contributors have a clear admission boundary;
- framework-wide ranking/certification language remains structurally difficult to infer from one result.

### Costs

- some integrations will expose more `UNSUPPORTED`, `NOT_TESTED` and `INDETERMINATE` states than a simpler pass/fail dashboard;
- profile authors may need to split compound ideas into multiple profiles;
- adapter documentation must distinguish support coverage from execution results.

These costs are accepted because epistemic clarity is part of the product value.

## Non-goals

This ADR does not:

- define a stable public package API;
- authorise npm publication;
- define framework scores;
- define a certification regime;
- add profile lifecycle fields to the current schema;
- change the current conformance-report schema by itself.

## Revisit conditions

Revisit only with executable evidence that the existing vocabulary cannot represent a real, bounded profile outcome without ambiguity. A desire for prettier dashboards, aggregate framework scoring, or marketing simplification is not sufficient evidence.