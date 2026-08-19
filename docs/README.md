# ActionSeam documentation

This directory separates orientation, normative behavior, maturity, provenance, and implementation notes so examples cannot silently redefine the project.

## Reading order

1. [`principles.md`](./principles.md) — the rules that shape public behavior and claims.
2. [`architecture.md`](./architecture.md) — the current clean-room reference architecture.
3. [`scope-and-limits.md`](./scope-and-limits.md) — explicit boundaries and non-goals.
4. [`result-model.md`](./result-model.md) — what each result state means.
5. [`profiles.md`](./profiles.md) — shipped profile families and their invariants.
6. [`evidence.md`](./evidence.md) — what a validator may rely on.
7. [`counterexamples.md`](./counterexamples.md) — failure reproduction and minimization.
8. [`adapters.md`](./adapters.md) — runtime/action-target extension model and transport-differential rules.
9. [`threat-model.md`](./threat-model.md) — what the experimental lab does and does not defend against.
10. [`maturity.md`](./maturity.md) — implementation and adapter maturity.
11. [`provenance.md`](./provenance.md) — clean-room and upstream-source rules.
12. [`validation-record.md`](./validation-record.md) — runtime/profile/action-target evidence history.
13. [`transport-validation.md`](./transport-validation.md) — transport-specific evidence kept separate from runtime-profile claims.
14. [`adr/`](./adr/) — material architecture decisions.

## Precedence

When prose examples conflict with a normative contract or a newer ADR, the normative contract / newer ADR wins. A scope expansion into runtime, orchestration, policy-engine, action-framework, or transport-equivalence territory requires explicit evidence and, when architectural, an ADR rather than an incidental code change.
