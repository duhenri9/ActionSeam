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

GitHub Actions run `32197878625` installed the exact public package and executed the full current ActionSeam profile corpus.

```text
ReferenceRuntime → InvoktaActionTarget@0.6.0
PASS 11
FAIL 0

KnownBadRuntime → InvoktaActionTarget@0.6.0
PASS 4
FAIL 7
```

Reference-runtime report digest:

`sha256:409af23d272937ee2c11e4ab9d7738d14b5d26860d876f78b0fe1f0d41c3a6f0`

Known-bad-runtime report digest:

`sha256:b67834b7f7bc87e24ff19b4fbb84cf1caec4e9a31a6e8f53661131e6562c3521`

The known-bad differential is intentionally mixed. With the unsafe runtime, the Invokta boundary preserved:

- `contracts.input-validation.v1`;
- `contracts.output-validation.v1`;
- `effects.stale-revision.v1`;
- `isolation.tenant-boundary.v1`.

It did **not** mask runtime-side failures in approval binding, monotonic deny, trusted-principal selection, retry/effect identity, untrusted-context authority, reconstruction, or secret handling.

This attribution is more important than a blanket score.

## Ownership notes

- **Input/output validation:** exercised through real Invokta schemas around `engine.invoke`.
- **Principal separation/access:** ActionSeam supplies identity separately; Invokta capability `access` compares the Principal tenant attribute to semantic input.
- **Stale revision:** ActionSeam synthetic state owns revision semantics; the Invokta capability prevents the failed provider operation from becoming a valid action success and the adapter normalizes the synthetic provider failure.
- **Retry/idempotency:** ActionSeam runtime/effect-id policy and synthetic provider own idempotency in this profile. Invokta executes each requested action invocation; this test does not claim Invokta supplies retry orchestration.

## Not supported yet

- Invokta CLI;
- MCP stdio;
- MCP HTTP;
- transport differential;
- production identity-provider integration;
- distributed provider semantics.

Those surfaces remain `NOT_TESTED`/unsupported by this adapter until separate evidence lands.
