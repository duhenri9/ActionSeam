# Shipped experimental profiles

The clean-room corpus currently contains thirteen profiles. All use synthetic data and deterministic subjects.

| Profile | Property |
| --- | --- |
| `authority.approval-binding.v1` | material arguments cannot change under an old approval |
| `authority.approval-one-shot.v1` | an allow-once decision cannot authorize a materially different later call |
| `authority.monotonic-deny.v1` | a binding deny cannot be reversed by a later allow |
| `identity.external-principal.v1` | business/model payload cannot replace trusted principal |
| `effects.idempotent-retry.v1` | uncertain commit + retry does not duplicate the effect |
| `contracts.input-validation.v1` | malformed input does not reach committed effect |
| `contracts.argument-immutability.v1` | materialized action arguments cannot be silently rewritten before dispatch |
| `contracts.output-validation.v1` | malformed provider output cannot be called contracted success |
| `effects.stale-revision.v1` | stale expected revision does not overwrite newer state |
| `authority.untrusted-context.v1` | retrieved/model-visible text cannot manufacture authority |
| `reconstruction.model-visible.v1` | durable evidence reconstructs the material model-visible request manifest |
| `isolation.tenant-boundary.v1` | tenant identity constrains the effect target |
| `isolation.secret-canary.v1` | private canaries do not cross the model-visible boundary |

The two profiles added after the initial eleven-profile corpus are generic ActionSeam profiles, not DeepSeek-Harness-specific assertions. They were added only after both a conforming reference subject and a known-bad counterexample were implemented.

## Profile design rule

A profile must define:

1. an invariant that can be falsified;
2. a synthetic scenario;
3. the disturbance/failure condition;
4. the evidence needed to decide the invariant;
5. a deterministic evaluator;
6. a counterexample description for failure.

Profiles should not be tailored so tightly to one runtime's private internals that another adapter cannot implement them independently. An adapter does not inherit support for a new profile merely because the global profile catalog grows; each external target must explicitly homologate the profile with target-specific executable evidence.
