# ActionSeam

**Adversarial conformance for agent runtimes, action boundaries, and committed effects.**

ActionSeam is an experimental open-source project by **WM3 Digital** for testing operational invariants across tool-using agent systems under controlled failure and adversarial conditions.

It runs the same synthetic profile against an exact runtime/action-target configuration, gathers inspectable evidence, and returns a scoped result. A failure should produce something a maintainer can reproduce — not just a score.

> **Maturity: EXPERIMENTAL / community preview.** The reference lab is executable. The Invokta `0.6.0` direct ActionTarget is **PARTIAL** with CI evidence; DeepSeek Harness remains **NOT IMPLEMENTED**. Community preview invites public reproduction and contribution; it is not a package release or production-safety certification.

## Community preview boundary

ActionSeam is launched for source-level testing, evidence review, profile proposals, and clean-room adapter contributions. The root package intentionally remains `private: true`: no npm publication, stable API promise, or package-support contract is implied by this community preview.

See [`docs/maturity.md`](./docs/maturity.md) and [ADR 0004](./docs/adr/0004-community-preview-launch.md).

## See it fail in under a minute

Requirements: Node.js 22+.

No install step or cloud credential is required for the reference lab.

```bash
git clone https://github.com/duhenri9/ActionSeam.git
cd ActionSeam
node --test
node src/cli.js demo --subject reference --out artifacts/reference
node src/cli.js demo --subject known-bad --out artifacts/known-bad
```

Current clean-room reference output:

```text
reference
PASS 11
FAIL 0

known-bad control subject
PASS 0
FAIL 11
```

The known-bad subject is deliberately vulnerable test equipment. It is **not** a model of DeepSeek Harness, Invokta, or another named project. Its purpose is to prove the validators can detect the properties they claim to test.

Open:

```text
artifacts/reference/inspector.html
artifacts/known-bad/inspector.html
```

or reproduce one failing invariant directly:

```bash
node src/cli.js run authority.approval-binding.v1 --subject known-bad
```

## The problem

A tool-using agent rarely owns the complete path from model-visible context to external state:

```text
model / runtime
      ↓
action request
      ↓
action boundary / transport
      ↓
provider
      ↓
committed state
```

Strong components can still fail at the seams between them.

ActionSeam currently exercises questions such as:

- Did materially changed arguments invalidate the approval that covered the old action?
- Can a later allow reverse a binding deny?
- Can payload fields named `principal`, `role`, or `tenant` replace trusted identity?
- What happens when the provider commits, the response disappears, and the runtime retries?
- Can malformed input reach an effect? Can malformed provider output be called success?
- Can a stale expected revision overwrite newer state?
- Can retrieved model-visible text manufacture authority?
- Can the material model-visible request be reconstructed from durable evidence?
- Can tenant-A mutate tenant-B synthetic state?
- Does a private canary cross the model-visible boundary?

## Result states

Each invariant returns exactly one:

```text
PASS
FAIL
UNSUPPORTED
NOT_TESTED
INDETERMINATE
```

A `PASS` is scoped to the exact profile, subject versions, configuration, and evidence in the report. `UNSUPPORTED` is not a weak pass, and `INDETERMINATE` is not a hidden failure.

ActionSeam does **not** issue blanket safety certification for a framework or product.

## Shipped experimental profiles

| Profile | Focus |
| --- | --- |
| `authority.approval-binding.v1` | approval ↔ material action arguments |
| `authority.monotonic-deny.v1` | deny cannot be silently reversed |
| `identity.external-principal.v1` | trusted identity versus payload identity |
| `effects.idempotent-retry.v1` | uncertain commit + retry |
| `contracts.input-validation.v1` | malformed action input |
| `contracts.output-validation.v1` | malformed provider output |
| `effects.stale-revision.v1` | concurrent/stale state |
| `authority.untrusted-context.v1` | retrieved content versus authority |
| `reconstruction.model-visible.v1` | durable request reconstruction |
| `isolation.tenant-boundary.v1` | synthetic tenant isolation |
| `isolation.secret-canary.v1` | private-to-model boundary |

See [`docs/profiles.md`](./docs/profiles.md) for the profile contract.

## Current target matrix

| Target | Role | Current state |
| --- | --- | --- |
| ActionSeam reference runtime | runtime | executable / experimental |
| ActionSeam reference action target | action target | executable / experimental |
| ActionSeam known-bad control subject | test control | executable / intentionally failing |
| DeepSeek Harness `@deepseek-ai/dsh@0.1.0-rc.7` | runtime target | **NOT IMPLEMENTED** |
| Invokta `@invokta/core@0.6.0` | action target | **PARTIAL** — direct `engine.invoke`; end-to-end reference matrix executed; boundary attribution documented; CLI/MCP/HTTP not tested |

Package/version research is not counted as adapter support. Provenance records live under [`adapters/`](./adapters/).

## First external differential result

The first real external ActionTarget evidence uses `@invokta/core@0.6.0` over direct `engine.invoke`:

```text
ReferenceRuntime → InvoktaActionTarget
PASS 11 / FAIL 0

KnownBadRuntime → InvoktaActionTarget
PASS 4 / FAIL 7
```

The `11 / 0` reference row is an **end-to-end composition result**, not eleven guarantees supplied by Invokta. The known-bad differential is used to attribute enforcement rather than turn the matrix into a blanket framework score.

In this adapter, real Invokta behavior directly enforces input validation, output validation, and capability access used by the tenant-boundary profile. Principal is supplied separately from business input at the Invokta API, but choosing a trusted principal remains a runtime responsibility. Stale-revision semantics and retry/idempotency remain ActionSeam synthetic provider/runtime responsibilities. Approval binding, monotonic deny, untrusted-context authority, reconstruction, and private-context handling are runtime properties.

See [`adapters/invokta/README.md`](./adapters/invokta/README.md) for exact attribution and limitations.

## Architecture at a glance

```text
versioned profile
   ├── synthetic scenario
   ├── fault / disturbance
   └── invariant
           │
           ▼
      runtime subject
           │
           ▼
       action target
           │
           ▼
 synthetic external state
           │
           ├── attempts
           ├── effects
           └── pre/post state
           │
           ▼
 evidence + validator
           │
           ▼
 conformance report
   ├── explicit result
   ├── evidence refs
   └── counterexample
```

ActionSeam adapts external systems; it does not replace them and does not adopt one upstream project's native types as its universal contract.

## What ActionSeam is not

ActionSeam is not another general agent runtime, action framework, workflow engine, MCP framework, model router, generic policy engine, production observability service, or security-certification authority.

The transition from probabilistic model behavior to deterministic external effects is one reason seams matter, but it is not the complete project scope: reconstruction, contracts, transports, recovery, tenancy, secret boundaries, and operator legibility matter too.

## Evidence and counterexamples

Reports use schema `actionseam.conformance-report/v0.1` and include a deterministic SHA-256 digest of the report body.

A failed profile carries:

- scenario id;
- expected invariant;
- observed divergence;
- bounded evidence near the failure;
- reproduction command.

Read [`docs/evidence.md`](./docs/evidence.md) and [`docs/counterexamples.md`](./docs/counterexamples.md).

## Clean-room provenance

This repository started from fresh Git history on 19 August 2026. The first commit is `bef467a98e735f425396a5dc4dd68d8360ce1755`.

The public implementation is original work authored here from public information, generic engineering knowledge, and synthetic ActionSeam scenarios. It is not a fork, repository split, sanitized export, or mechanical rewrite of a private WM3 codebase.

See [`docs/provenance.md`](./docs/provenance.md).

## Documentation

Start with [`docs/README.md`](./docs/README.md).

The documentation separates principles, architecture, scope/limits, result semantics, profiles, evidence, counterexamples, adapters, threat model, maturity, provenance, validation records, and ADRs.

## Contributing

Bring a runtime, an action boundary, a profile, or a smaller counterexample.

Before contributing, read [`CONTRIBUTING.md`](./CONTRIBUTING.md). Potentially sensitive upstream findings should follow [`SECURITY.md`](./SECURITY.md) before public disclosure.

## License

Apache License 2.0. See [`LICENSE`](./LICENSE).

---

**ActionSeam** · an open-source project by **WM3 Digital**
