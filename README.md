# ActionSeam

**Adversarial conformance for agent runtimes, action boundaries, and committed effects.**

ActionSeam is an open-source project by **WM3 Digital** for testing operational invariants across tool-using agent systems under controlled failure and adversarial conditions.

It runs the same synthetic scenario against an exact runtime/action-system configuration, collects independently useful evidence, and returns a scoped conformance result. When an invariant fails, the goal is not a vague score: it is a counterexample another engineer can reproduce.

> **Maturity: experimental / pre-launch.** This repository has just been initialized from a clean history. No external runtime or action-system adapter is advertised as supported yet.

## What problem does it address?

A tool-using agent rarely owns the whole path from decision to external state:

```text
scenario
   ↓
agent runtime
   ↓
action boundary / transport
   ↓
provider
   ↓
committed state
```

Each layer can be individually well-designed while a cross-layer invariant still fails.

Examples:

- an approval can become stale after material arguments change;
- a later response can accidentally override a binding deny;
- identity-like fields inside model/business input can be mistaken for trusted identity;
- a provider can commit successfully while the response is lost, causing a retry to duplicate the effect;
- the same semantic action can behave differently across delivery transports;
- telemetry can show *something happened* without providing enough evidence to reconstruct what materially influenced execution.

ActionSeam is designed to make those properties testable without requiring real customer data or real external side effects.

## Result model

An invariant result is deliberately explicit:

```text
PASS
FAIL
UNSUPPORTED
NOT_TESTED
INDETERMINATE
```

`UNSUPPORTED` is not a weak pass. `INDETERMINATE` is not a hidden failure. Results are scoped to the exact versions, profiles, transports, fixtures, and evidence available for the run.

ActionSeam does **not** issue blanket safety certification for a framework or product.

## Project direction

The first clean-room implementation will establish:

- framework-neutral scenario, runtime-adapter, action-target, evidence, invariant, and report contracts;
- a hermetic reference runtime and action target;
- deterministic synthetic external state;
- a deliberately vulnerable reference subject so the test suite proves it can detect failures;
- versioned failure/adversarial profiles;
- counterexample-first reporting;
- an operator-legible Inspector;
- public adapters for selected external projects only after their observable/control surfaces are verified.

The first external research targets are **DeepSeek Harness** as an agent-runtime target and **Invokta** as an action-boundary target. Neither project defines ActionSeam's core contracts, and neither is treated as a foundation or dependency of the project thesis.

## What ActionSeam is not

ActionSeam is not another general-purpose agent runtime, workflow engine, MCP framework, action framework, model router, generic policy engine, observability stack, or security-certification service.

It is also not an open-source edition of any proprietary WM3 product.

## Clean-room origin

This repository was intentionally created with a fresh Git history.

The public implementation is authored from public specifications, public upstream interfaces, generic engineering knowledge, and synthetic scenarios created specifically for ActionSeam. It is not a fork, repository split, subtree, sanitized export, or mechanical rewrite of a private WM3 codebase.

A detailed provenance policy will be part of the first implementation PR.

## Community posture

The long-term contribution loop is simple:

```text
add or update a runtime/action adapter
              ↓
run the same versioned profiles
              ↓
PASS / FAIL / UNSUPPORTED + evidence
              ↓
reproduce a counterexample when applicable
              ↓
fix upstream / adapter / profile
              ↓
run it again
```

The project should create useful technical dialogue with runtime and action-system maintainers, not a leaderboard of blanket claims.

## License

ActionSeam is being released under the **Apache License 2.0**. The canonical license file is added as part of repository bootstrap.

---

**ActionSeam** · an open-source project by **WM3 Digital**
