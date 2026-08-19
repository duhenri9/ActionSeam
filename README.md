# ActionSeam

**Adversarial conformance testing for agent runtimes, action boundaries, transports, and committed effects.**

[![CI](https://github.com/duhenri9/ActionSeam/actions/workflows/ci.yml/badge.svg)](https://github.com/duhenri9/ActionSeam/actions/workflows/ci.yml)

ActionSeam is an experimental open-source project by **WM3 Digital** for testing operational invariants in tool-using agent systems under controlled failure and adversarial conditions.

It is built around a simple rule:

> **A green test is not enough. A claim needs a real mechanism, bounded evidence, and a reproducible counterexample when the invariant fails.**

ActionSeam runs versioned synthetic profiles against exact runtime/action-target configurations, records inspectable evidence, and reports one explicit result: `PASS`, `FAIL`, `UNSUPPORTED`, `NOT_TESTED`, or `INDETERMINATE`.

> **Maturity: EXPERIMENTAL / community preview.** The source-level reference lab is executable. DeepSeek Harness `0.1.0-rc.7` and Invokta `0.6.0` have narrowly scoped executable evidence. The root package is intentionally private and unpublished. ActionSeam does not provide blanket framework safety certification.

## See it work in under a minute

Requirements: **Node.js 22+**. No package install, model API key, or cloud credential is required for the reference lab.

```bash
git clone https://github.com/duhenri9/ActionSeam.git
cd ActionSeam
node --test
node src/cli.js demo --subject reference --out artifacts/reference
node src/cli.js demo --subject known-bad --out artifacts/known-bad
```

Expected clean-room summary:

```text
reference
PASS 13
FAIL 0

known-bad control subject
PASS 0
FAIL 13
```

The deliberately vulnerable known-bad subject is ActionSeam test equipment. It is **not** a model, rating, or reproduction of DeepSeek Harness, Invokta, or another external project.

Generated evidence:

```text
artifacts/reference/report.json
artifacts/reference/inspector.html
artifacts/known-bad/report.json
artifacts/known-bad/inspector.html
```

For small runnable examples, start at [`examples/`](./examples/).

## Why ActionSeam exists

Agent systems cross boundaries that a single component rarely owns end to end:

```text
model / runtime
      ↓
action request
      ↓
authority + contracts
      ↓
action boundary / transport
      ↓
provider
      ↓
committed state
```

A strong model, runtime, tool framework, policy layer, or transport can still compose into an unsafe or ambiguous system at the seams between them.

ActionSeam asks concrete questions such as:

- Did materially changed arguments invalidate the approval that covered the old action?
- Does an allow-once decision stay limited to the call that asked for it?
- Can a later allow reverse a binding deny?
- Can payload fields manufacture trusted identity?
- What happens when a provider commits, the response disappears, and the runtime retries?
- Can malformed input reach an effect?
- Can materialized tool arguments be silently rewritten before dispatch?
- Can malformed provider output masquerade as success?
- Can stale state overwrite newer state?
- Can retrieved model-visible text manufacture authority?
- Can the material model-visible request be reconstructed from durable evidence?
- Can tenant-A mutate tenant-B synthetic state?
- Does a private canary cross the model-visible boundary?
- Does a real transport preserve the same material action/effect semantics as a direct path?
- Does cancellation actually stop the verified pre-dispatch path, or did the system merely emit a cancel message?

## Evidence, not framework scores

Each profile returns exactly one result:

```text
PASS
FAIL
UNSUPPORTED
NOT_TESTED
INDETERMINATE
```

A `PASS` is scoped to the **exact profile, subject version, configuration, and accepted evidence**. It does not become a general safety claim about that framework.

`UNSUPPORTED` is not a weak pass. `INDETERMINATE` is not a hidden failure. External targets do not inherit new profiles merely because the global catalog grows.

Read the normative result semantics in [`docs/result-model.md`](./docs/result-model.md) and evidence rules in [`docs/evidence.md`](./docs/evidence.md).

## Current verified surface

| Subject | Role | Evidence-backed state |
| --- | --- | --- |
| ActionSeam reference runtime | runtime | experimental / executable — **13/13 PASS** |
| ActionSeam known-bad subject | differential control | deliberately vulnerable — **0/13 PASS** |
| DeepSeek Harness `0.1.0-rc.7` | runtime | **PARTIAL** — 7 explicitly homologated ActionSeam profiles |
| DeepSeek Harness ACP `0.1.0-rc.7` | transport | **PARTIAL** — real stdio baseline + one-shot permission allow/reject + pre-tool-dispatch `session/cancel` |
| Invokta `@invokta/core@0.6.0` | action target | **PARTIAL** — direct `engine.invoke`, pinned to its original 11-profile homologated scope |

Package discovery or a booting integration does not count as support. Every external support row must point to executable evidence and an attribution boundary.

### DeepSeek Harness runtime

The DSH runtime evidence uses published `0.1.0-rc.7` components with frozen dependencies and an independently authored deterministic ActionSeam LLM adapter. The adapter makes zero network model-provider calls while the real DSH AgentLoop, Session, ToolRuntime, guard, validation, approval, and invariant surfaces remain in the path being tested.

Seven profiles are currently homologated:

- `authority.approval-one-shot.v1`
- `authority.monotonic-deny.v1`
- `contracts.input-validation.v1`
- `contracts.argument-immutability.v1`
- `contracts.output-validation.v1`
- `authority.untrusted-context.v1`
- `reconstruction.model-visible.v1`

This does **not** claim DSH-native support for external-principal semantics, idempotent effect retry, stale revision, tenant isolation, private secret canaries, or the older post-approval mutation/invalidation profile.

Exact evidence and attribution: [`adapters/deepseek-harness/README.md`](./adapters/deepseek-harness/README.md).

### DeepSeek Harness ACP transport

ACP is tracked independently from runtime-profile conformance. The promoted transport evidence uses real Node child processes, JSON-RPC over stdin/stdout, and official `@agentclientprotocol/sdk@0.25.1`.

Three separate slices are currently evidenced:

1. **baseline semantic preservation** — same material tool arguments, one execution, same synthetic committed effect, same final text;
2. **one-shot permission mapping** — `allow_once` maps to one allowed effect and `reject_once` maps to no effect;
3. **pre-tool-dispatch `session/cancel`** — model request confirmed in flight, real cancel notification targets the active session, DSH model `AbortSignal` is observed, the direct Agent turn ends `aborted / user`, the ACP prompt settles `cancelled`, and zero tool/effect execution occurs.

The cancellation claim stops there. It does **not** claim rollback after a tool starts, rollback of a committed effect, or cancellation of a non-cooperative running tool.

Exact transport evidence: [`adapters/deepseek-harness/acp-transport/README.md`](./adapters/deepseek-harness/acp-transport/README.md) and [`docs/transport-validation.md`](./docs/transport-validation.md).

### Invokta action target

The Invokta adapter uses public `@invokta/core@0.6.0` direct `engine.invoke` surfaces with frozen dependencies.

The reference composition passes the **11 profiles explicitly homologated when that adapter was verified**. That end-to-end result is not eleven guarantees supplied natively by Invokta; enforcement ownership is documented profile by profile.

Exact evidence and attribution: [`adapters/invokta/README.md`](./adapters/invokta/README.md).

## Shipped experimental profiles

| Profile | Focus |
| --- | --- |
| `authority.approval-binding.v1` | approval stays bound to material action arguments |
| `authority.approval-one-shot.v1` | one-shot authority cannot authorize a later materially different call |
| `authority.monotonic-deny.v1` | binding deny cannot be silently reversed |
| `identity.external-principal.v1` | trusted identity remains separate from payload identity |
| `effects.idempotent-retry.v1` | uncertain commit + retry does not duplicate effect |
| `contracts.input-validation.v1` | malformed action input |
| `contracts.argument-immutability.v1` | materialized action arguments cannot be silently rewritten |
| `contracts.output-validation.v1` | malformed provider output |
| `effects.stale-revision.v1` | stale/concurrent state |
| `authority.untrusted-context.v1` | retrieved text does not become authority |
| `reconstruction.model-visible.v1` | durable model-visible request reconstruction |
| `isolation.tenant-boundary.v1` | synthetic tenant isolation |
| `isolation.secret-canary.v1` | private-to-model boundary |

See [`docs/profiles.md`](./docs/profiles.md).

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

ActionSeam adapts external systems; it does not replace them and does not use one upstream project's native types as its universal contract.

## Security posture

This repository is public from its clean-room root history. CI includes a fail-closed public-history credential scan that fetches public branches/tags and scans reachable Git blobs for high-signal credential classes without printing matched secret values.

That gate is evidence for the detector classes and Git objects actually inspected; it is **not** described as mathematical proof that every unknown or proprietary secret format is absent.

See [`SECURITY.md`](./SECURITY.md) for credential hygiene, disclosure, and rotate-first incident guidance.

## Community preview and package boundary

ActionSeam is currently distributed as source, not as a stable package.

The root package intentionally remains:

```text
version: 0.0.0-experimental
private: true
```

There is no npm release, stable JavaScript API promise, or package-support contract yet. Publication requires explicit API/package gates and a dedicated ADR.

See [`docs/release-readiness.md`](./docs/release-readiness.md) for the release criteria.

## What ActionSeam is not

ActionSeam is not another general agent runtime, workflow engine, MCP framework, model router, generic policy engine, production observability product, or security-certification authority.

It is a conformance lab for making narrow operational claims **harder to overstate and easier to reproduce**.

## Documentation map

- Start here: [`docs/README.md`](./docs/README.md)
- Runnable examples: [`examples/README.md`](./examples/README.md)
- Principles: [`docs/principles.md`](./docs/principles.md)
- Architecture: [`docs/architecture.md`](./docs/architecture.md)
- Scope and limits: [`docs/scope-and-limits.md`](./docs/scope-and-limits.md)
- Result model: [`docs/result-model.md`](./docs/result-model.md)
- Profiles: [`docs/profiles.md`](./docs/profiles.md)
- Evidence: [`docs/evidence.md`](./docs/evidence.md)
- Counterexamples: [`docs/counterexamples.md`](./docs/counterexamples.md)
- Adapters: [`docs/adapters.md`](./docs/adapters.md)
- Runtime validation: [`docs/validation-record.md`](./docs/validation-record.md)
- Transport validation: [`docs/transport-validation.md`](./docs/transport-validation.md)
- Threat model: [`docs/threat-model.md`](./docs/threat-model.md)
- Maturity: [`docs/maturity.md`](./docs/maturity.md)
- Clean-room provenance: [`docs/provenance.md`](./docs/provenance.md)
- Release readiness: [`docs/release-readiness.md`](./docs/release-readiness.md)

## Contributing

Bring a runtime, action boundary, profile, transport differential, smaller counterexample, or reproduction improvement.

Read [`CONTRIBUTING.md`](./CONTRIBUTING.md) first. Potentially sensitive upstream findings should follow [`SECURITY.md`](./SECURITY.md) before public disclosure.

## Clean-room provenance

ActionSeam started from fresh public Git history on 19 August 2026. The implementation is original work authored from public information, generic engineering knowledge, and synthetic ActionSeam scenarios. It is not a fork, repository split, sanitized export, or mechanical rewrite of a private WM3 implementation.

Details: [`docs/provenance.md`](./docs/provenance.md).

## License

Apache License 2.0. See [`LICENSE`](./LICENSE).

---

**ActionSeam** · an open-source project by **WM3 Digital**
