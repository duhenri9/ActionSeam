# Bring your runtime to ActionSeam

This guide is the shortest current path from “I have an agent runtime” to “I can run one bounded ActionSeam profile against a real seam”. It is deliberately source-level and experimental. It does not define a stable package API.

Start with the executable template:

```bash
node examples/bring-your-runtime.mjs
```

The template runs one shipped profile twice:

1. a candidate adapter with a real approval-binding check before dispatch;
2. a negative control where that check is deliberately removed.

Expected shape:

```text
candidate: PASS, zero committed effects
negative control: FAIL, one committed effect
```

The point is not the example runtime itself. The point is the integration shape and evidence discipline: the same profile must distinguish the mechanism from its absence.

## The current source-level runtime seam

A runtime supplied to `runProfile(...)` currently exposes:

```text
metadata
  id
  version

execute({ scenario, actionTarget, store })
  -> {
       outcome,
       principal,
       evidence,
       result
     }
```

`scenario` is the bounded synthetic work for the selected profile. `actionTarget` is the ActionSeam-compatible synthetic action boundary. `store` owns synthetic committed state used by the validator.

This shape is an experimental source contract. It may change before package publication. See [`release-readiness.md`](./release-readiness.md).

## Replace only the seam you own

For a runtime integration, replace the example adapter's `execute(...)` body with calls to the exact public runtime surface you want to evaluate. Keep ActionSeam's synthetic action target and state boundary unless the integration is specifically an action-target adapter.

A useful runtime adapter normally needs to:

- identify the exact runtime version/configuration;
- submit the profile's bounded synthetic work;
- map the runtime's real tool/action path to the supplied ActionSeam action target;
- capture the evidence the profile actually needs;
- coordinate only disturbances that the real public surface can represent;
- fail closed when required evidence cannot be observed.

Do not add adapter logic that silently implements the invariant on behalf of the runtime and then attribute the PASS to the runtime. Evidence must make enforcement ownership clear.

## Start with one profile

Choose one profile whose mechanism genuinely exists at the target seam. For example:

```js
import { profiles } from '../src/profiles/index.js'

const profile = profiles.find(
  ({ id }) => id === 'authority.approval-binding.v1',
)
```

Then run only that bounded claim while the adapter is being established. Do not inherit the entire global profile catalog merely because the adapter can boot.

## Keep a negative control

A promoted integration needs more than a green candidate. The validator should also reject a meaningful broken case.

The executable template removes the approval-binding comparison while keeping the rest of the path materially the same. The same shipped profile then returns `FAIL` and produces a counterexample.

For another invariant, choose a negative control that removes or corrupts the exact mechanism being claimed, not an unrelated failure.

## Promotion checklist

Before changing an adapter from “experiment” to an evidence-backed `PARTIAL` claim, record all of the following:

1. **Exact subject** — upstream repository/package, version, commit or source snapshot, and relevant configuration.
2. **Real mechanism** — the public runtime/action/transport seam that owns the behavior.
3. **Bounded profile scope** — only the profiles or transport slices actually executed.
4. **Accepted evidence** — observations that prove the invariant rather than merely showing that a method was called.
5. **Negative control** — a reproducible corruption or removed mechanism that the comparator/profile rejects.
6. **Frozen reproduction** — lockfile or equivalent dependency freeze plus deterministic commands.
7. **CI evidence** — green run and artifact identifiers for the exact promoted head.
8. **Explicit exclusions** — adjacent capabilities that remain unsupported, untested, or indeterminate.
9. **Attribution** — what is enforced by the upstream target versus ActionSeam test scaffolding.

Only after those items exist should documentation or provenance advertise support.

## When not to claim support

Do not promote a PASS when:

- the test adapter itself supplies the security property being attributed to the upstream runtime;
- the required evidence is private, unavailable, or reconstructed only by assumption;
- the scenario does not cross the real boundary named by the claim;
- a negative control cannot demonstrate that the validator detects the relevant failure;
- the target version/configuration is not pinned;
- a broader profile or transport surface was never executed.

Use `UNSUPPORTED`, `NOT_TESTED`, `INDETERMINATE`, or an explicit “not claimed” boundary as appropriate. A smaller defensible claim is preferable to a larger inferred one.

## From example to adapter directory

Once one profile is real and reproducible, move the integration into an isolated adapter directory with its own provenance, dependency freeze, reproduction commands, evidence capture, and scope documentation. Existing examples:

- [`../adapters/deepseek-harness/`](../adapters/deepseek-harness/)
- [`../adapters/invokta/`](../adapters/invokta/)

Read [`adapters.md`](./adapters.md) for the role model and [`evidence.md`](./evidence.md) for evidence rules.
