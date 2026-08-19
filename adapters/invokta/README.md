# Invokta action-target adapter

**Status: PARTIAL / executable for the direct `engine.invoke` boundary.**

This adapter targets the real public `@invokta/core@0.6.0` package over its direct `engine.invoke` path.

## Boundary

ActionSeam owns the synthetic scenario, trusted ActionSeam principal, effect id, synthetic external state, fault injection, invariant evaluator, report, and counterexample.

The adapter maps those inputs into a real Invokta Action Engine that owns:

- capability input validation;
- a capability `access` check using Invokta's separately supplied `Principal`;
- capability execution;
- output validation;
- public Invokta invocation events.

Invokta-native types remain inside this directory. The ActionSeam core does not depend on `@invokta/core`.

## Exact upstream

- package: `@invokta/core@0.6.0`;
- source/docs snapshot reviewed: `10648f80a1df9cbe21e99eb3119772f3ad824b12`;
- license: MIT;
- transport in this adapter: `direct` only;
- transitive install is frozen by the committed adapter `package-lock.json`.

## Executable evidence

GitHub Actions run `32198408794` tested ActionSeam head `54c1ccd66c1263ec39a1c128bcbb83b331fadb1d`, installed the exact public package, ran adapter verification, and generated the current matrix evidence.

```text
ReferenceRuntime → InvoktaActionTarget@0.6.0
PASS 11
FAIL 0

KnownBadRuntime → InvoktaActionTarget@0.6.0
PASS 4
FAIL 7
```

Reference-runtime report digest:

`sha256:f5189883ecca3ff46515ecb7f3db55ea0b3715dabd6c0731196ec25f8a4f901a`

Known-bad-runtime report digest:

`sha256:03aa37c5a235685d2227b0b12fdd357a99dc242bef3e37e948ceecc83fb5c65b`

Workflow artifact:

- artifact id: `9346637326`;
- artifact digest: `sha256:ba6ad7f1b541af4299781f91643ca7db3b3f7176f9a7f2d40a039aa5d3b2fa82`.

The known-bad differential is intentionally mixed. It is used to identify which layer is preserving an invariant rather than to assign a blanket score to Invokta.

## Attribution matrix

| Profile / property | What the evidence says | Primary owner in this subject |
| --- | --- | --- |
| `contracts.input-validation.v1` | malformed input is rejected before capability execution | **Invokta-enforced** schema validation |
| `contracts.output-validation.v1` | malformed capability output cannot surface as contracted success | **Invokta-enforced** schema validation |
| `isolation.tenant-boundary.v1` | cross-tenant semantic input is rejected before synthetic mutation | **Invokta-enforced** capability `access` rule defined by this adapter |
| `identity.external-principal.v1` | Principal travels outside business input at the Invokta API | API separation is exercised; **trusted-principal selection remains runtime-owned** |
| `effects.stale-revision.v1` | stale synthetic state is not overwritten and the provider failure is normalized | **ActionSeam synthetic provider owns revision semantics**; adapter preserves/normalizes the failure |
| `effects.idempotent-retry.v1` | uncertain commit retry can resolve to one committed effect | **ActionSeam runtime effect-id reuse + synthetic provider dedupe**; no Invokta retry guarantee claimed |
| approval binding / monotonic deny / untrusted-context authority | unsafe runtime behavior remains visible as FAIL | **runtime-owned** |
| model-visible reconstruction / secret canary | unsafe runtime behavior remains visible as FAIL | **runtime-owned** |

Therefore the `ReferenceRuntime → InvoktaActionTarget` `11 PASS / 0 FAIL` row is an **end-to-end composition result**. It must not be read as eleven native Invokta guarantees.

The four PASS results under `KnownBadRuntime` are also not all Invokta-owned: input validation, output validation, and tenant access are enforced at the Invokta boundary; stale revision is preserved because the ActionSeam synthetic provider owns revision checking and the adapter does not turn that failure into success.

## Ownership notes

- **Input/output validation:** exercised using the real Invokta schema boundary around `engine.invoke`.
- **Principal separation/access:** ActionSeam supplies identity separately; Invokta snapshots the supplied Principal and its capability `access` rule receives that principal separately from semantic input. The runtime is still responsible for establishing which principal is trustworthy.
- **Stale revision:** ActionSeam synthetic state owns revision semantics. The adapter maps the provider failure into stable ActionSeam evidence; this is not a claim that Invokta provides optimistic concurrency control.
- **Retry/idempotency:** ActionSeam runtime/effect-id policy and synthetic provider own idempotency in this profile. Invokta executes each requested invocation; this test does not claim Invokta supplies retry orchestration or effect deduplication.
- **Authority, reconstruction, and private-context handling:** these profiles test the runtime side of the composition. Their PASS under the reference runtime and FAIL under the known-bad runtime should not be attributed to Invokta.

## Not supported yet

- Invokta CLI;
- MCP stdio;
- MCP HTTP;
- transport differential;
- production identity-provider integration;
- distributed provider semantics.

Those surfaces remain `NOT_TESTED`/unsupported by this adapter until separate evidence lands.
