# ActionSeam documentation

This directory separates orientation, normative behavior, maturity, provenance, validation records, and release policy so examples or presentation changes cannot silently redefine the project.

## Start by intent

- **I want to run it:** see [`../examples/README.md`](../examples/README.md).
- **I want to bring my runtime:** start with [`bring-your-runtime.md`](./bring-your-runtime.md), then read [`adapters.md`](./adapters.md).
- **I want to understand the claim model:** read [`principles.md`](./principles.md), [`result-model.md`](./result-model.md), and [`evidence.md`](./evidence.md).
- **I want to inspect supported profiles:** read [`profiles.md`](./profiles.md).
- **I want to integrate a runtime/action target:** read [`adapters.md`](./adapters.md) and the adapter-local evidence under [`../adapters/`](../adapters/).
- **I want the exact validation history:** read [`validation-record.md`](./validation-record.md) and [`transport-validation.md`](./transport-validation.md).
- **I want to know what is not claimed:** read [`scope-and-limits.md`](./scope-and-limits.md), [`threat-model.md`](./threat-model.md), and [`maturity.md`](./maturity.md).
- **I want to understand package publication:** read [`release-readiness.md`](./release-readiness.md).

## Recommended reading order

1. [`principles.md`](./principles.md) — the rules that shape public behavior and claims.
2. [`architecture.md`](./architecture.md) — the current clean-room reference architecture.
3. [`scope-and-limits.md`](./scope-and-limits.md) — explicit boundaries and non-goals.
4. [`result-model.md`](./result-model.md) — what each result state means.
5. [`profiles.md`](./profiles.md) — shipped profile families and their invariants.
6. [`evidence.md`](./evidence.md) — what a validator may rely on.
7. [`counterexamples.md`](./counterexamples.md) — failure reproduction and minimization.
8. [`bring-your-runtime.md`](./bring-your-runtime.md) — shortest bounded path from a runtime seam to one defensible profile result.
9. [`adapters.md`](./adapters.md) — runtime/action-target extension model and transport-differential rules.
10. [`threat-model.md`](./threat-model.md) — what the experimental lab does and does not defend against.
11. [`maturity.md`](./maturity.md) — implementation and adapter maturity.
12. [`provenance.md`](./provenance.md) — clean-room and upstream-source rules.
13. [`validation-record.md`](./validation-record.md) — runtime/profile/action-target evidence history.
14. [`transport-validation.md`](./transport-validation.md) — transport-specific evidence kept separate from runtime-profile claims.
15. [`release-readiness.md`](./release-readiness.md) — gates required before package publication.
16. [`adr/`](./adr/) — material architecture decisions.

## Precedence

When prose examples conflict with a normative contract or a newer ADR, the normative contract / newer ADR wins. A scope expansion into runtime, orchestration, policy-engine, action-framework, package-support, or transport-equivalence territory requires explicit evidence and, when architectural, an ADR rather than an incidental code or documentation change.
