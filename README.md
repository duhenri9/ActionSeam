# ActionSeam

**Adversarial conformance for agent runtimes, action boundaries, and committed effects.**

ActionSeam is an experimental open-source project by **WM3 Digital** for testing operational invariants across tool-using agent systems under controlled failure and adversarial conditions.

It runs the same synthetic profile against an exact runtime/action-target configuration, gathers inspectable evidence, and returns a scoped result. A failure should produce something a maintainer can reproduce — not just a score.

> **Maturity: EXPERIMENTAL / community preview.** The reference lab is executable. DeepSeek Harness `0.1.0-rc.7` and Invokta `0.6.0` both have narrowly scoped **PARTIAL** executable evidence. DeepSeek Harness also has separate **PARTIAL ACP JSON-RPC stdio transport evidence** for the baseline semantic differential and one-shot permission allow/reject mapping; those transport results do not imply all runtime profiles were tested over ACP. Community preview invites public reproduction and contribution; it is not a package release or production-safety certification.

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
PASS 13
FAIL 0

known-bad control subject
PASS 0
FAIL 13
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
- Does an allow-once approval stay limited to the call that asked for it?
- Can a later allow reverse a binding deny?
- Can payload fields named `principal`, `role`, or `tenant` replace trusted identity?
- What happens when the provider commits, the response disappears, and the runtime retries?
- Can malformed input reach an effect? Can materialized arguments be silently rewritten? Can malformed provider output be called success?
- Can a stale expected revision overwrite newer state?
- Can retrieved model-visible text manufacture authority?
- Can the material model-visible request be reconstructed from durable evidence?
- Can tenant-A mutate tenant-B synthetic state?
- Does a private canary cross the model-visible boundary?
- Does a real transport preserve the same material tool/effect semantics as a direct runtime path?
- Does a one-shot permission decision preserve the same effect/no-effect meaning across that transport?

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
| `authority.approval-binding.v1` | approval ↔ material action arguments after approval |
| `authority.approval-one-shot.v1` | an allow-once grant cannot authorize a materially different later call |
| `authority.monotonic-deny.v1` | deny cannot be silently reversed |
| `identity.external-principal.v1` | trusted identity versus payload identity |
| `effects.idempotent-retry.v1` | uncertain commit + retry |
| `contracts.input-validation.v1` | malformed action input |
| `contracts.argument-immutability.v1` | materialized action arguments cannot be silently rewritten |
| `contracts.output-validation.v1` | malformed provider output |
| `effects.stale-revision.v1` | concurrent/stale state |
| `authority.untrusted-context.v1` | retrieved content versus authority |
| `reconstruction.model-visible.v1` | durable request reconstruction |
| `isolation.tenant-boundary.v1` | synthetic tenant isolation |
| `isolation.secret-canary.v1` | private-to-model boundary |

The two profiles added after the initial eleven-profile corpus are generic ActionSeam profiles. External adapters do not inherit them automatically; each target must separately homologate them with executable evidence.

See [`docs/profiles.md`](./docs/profiles.md) for the profile contract.

## Current target matrix

| Target | Role | Current state |
| --- | --- | --- |
| ActionSeam reference runtime | runtime | executable / experimental — 13/13 |
| ActionSeam reference action target | action target | executable / experimental |
| ActionSeam known-bad control subject | test control | executable / intentionally failing — 0/13 |
| DeepSeek Harness `@deepseek-ai/dsh@0.1.0-rc.7` | runtime target | **PARTIAL** — 7 explicitly homologated runtime profiles; separately **PARTIAL** for real ACP stdio baseline + one-shot permission allow/reject transport slices |
| Invokta `@invokta/core@0.6.0` | action target | **PARTIAL** — direct `engine.invoke`; its explicitly homologated scope remains the original 11 profiles; CLI/MCP/HTTP not tested |

Package/version research alone is not counted as adapter support. Provenance and evidence records live under [`adapters/`](./adapters/).

## DeepSeek Harness runtime differential

The promoted DSH runtime evidence uses published `0.1.0-rc.7` components only. The original five profiles continue to exercise the real Agent spine/AgentLoop composition. Two additional generic profiles exercise public DSH mechanisms directly: `@deepseek-ai/dsh-user-approval` one-shot decisions and ToolRuntime's lossless snapshot/deep-freeze of execution arguments.

The ActionTarget is deliberately permissive so it cannot rescue runtime failures.

```text
DeepSeekHarnessExtendedRuntime → PermissiveActionTarget
PASS 7 / FAIL 0
report digest: sha256:56affd3e90ac1a7d6aab2d2ee26f6f766ef6a34df99e2fc485ae5c0b70977f38

KnownBadRuntime → PermissiveActionTarget
PASS 0 / FAIL 7
report digest: sha256:efff30484a751ceb4602a67dceb382c0cafbc936b2fd922f2c291db234a8939a
```

The seven tested profiles are approval one-shot, monotonic deny, input validation, argument immutability, output validation, untrusted-context authority, and model-visible reconstruction.

For approval one-shot, the real DSH approval service records two fresh `approval/asked → approval/decided` pairs: the first call is `allowed-once`, the materially changed second call is rejected, and only the first effect commits. For argument immutability, a real `tools/execute` wrapper attempts to change `amount: 50` to `500`; the DSH execution arguments are frozen, the mutation raises a `TypeError`, before/after digests remain identical, and the committed effect stays `50`.

This runtime-profile result is **not** a claim about the older post-approval mutation/invalidation profile, external principal semantics, idempotent retry, stale revision, tenant isolation, secret canaries, or production filesystem/sandbox safety.

See [`adapters/deepseek-harness/README.md`](./adapters/deepseek-harness/README.md) for the exact runtime evidence, attribution, and exclusions.

## DeepSeek Harness ACP stdio transport differential

Transport is tracked independently from runtime-profile conformance. The baseline compares the same deterministic DSH tool/effect scenario over a direct published AgentLoop/ToolRuntime path and a **real child process** running public `@deepseek-ai/dsh-acp@0.1.0-rc.7`, driven over stdin/stdout JSON-RPC by official `@agentclientprotocol/sdk@0.25.1`.

Both baseline paths produce exactly one tool execution with `tenant-A / transport-account-A / amount 7`, the same revision-1/value-7 synthetic effect, zero network model calls, and final text `actionseam-transport-complete`. The ACP path additionally proves `initialize`, `session/new`, `session/prompt`, `end_turn`, committed `agent_message_chunk` delivery, and stdout protocol purity. A deliberate `effect.value +1000` negative control is detected as `synthetic-effect`.

Promoted baseline evidence:

```text
head:     205d992c164fd06b76aef79cc66012861c98f782
CI run:   32205337074
artifact: 9348915317
sha256:   85481ca768c6402aa0849883f1e386b8ea0902cb66099da50d750df613c3a8d0
```

### ACP one-shot permission differential

A separately promoted gate exercises the same public DSH ToolRuntime `ask` seam direct and across the real ACP stdio bridge.

`allow-once` on both paths:

```text
ACP method: session/request_permission
session id: exact active ACP session
toolCallId: actionseam-transport-call-1
options: allow-once/allow_once, reject-once/reject_once
DSH outcome: allowed-once
tool executions: 1
committed effect: revision 1 / value 7
```

`reject-once` on both paths:

```text
same exact request identity/options
DSH outcome: rejected
tool executions: 0
committed effect: none
```

Both permission cases match direct-vs-ACP with no semantic mismatches. A negative control injects the real allow effect into the reject result and is detected by `tool-executions` and `effect` mismatches.

Promoted permission evidence:

```text
head:     af8558cb17c414a3fcb39008b43897b3734e384d
CI run:   32206488629
artifact: 9349296445
sha256:   b9cd1c5161dd3dc2a2098b76e2712fad441dd6531528c52dbb59121b03fec217
```

Current ACP `PARTIAL` evidence still does **not** claim graceful shutdown, cancelled permission-response equivalence, `session/cancel`, multi-session isolation, images, MCP, HTTP, Web/GUI RPC, CLI equivalence beyond the exact child processes, all seven runtime profiles over ACP, or production safety.

See [`adapters/deepseek-harness/acp-transport/README.md`](./adapters/deepseek-harness/acp-transport/README.md) and [`docs/transport-validation.md`](./docs/transport-validation.md).

## Invokta action-boundary differential

The first real external ActionTarget evidence uses `@invokta/core@0.6.0` over direct `engine.invoke`:

```text
ReferenceRuntime → InvoktaActionTarget
PASS 11 / FAIL 0

KnownBadRuntime → InvoktaActionTarget
PASS 4 / FAIL 7
```

That matrix is intentionally pinned to the eleven profiles homologated when the Invokta adapter was verified. The two later profiles are not silently added to the Invokta claim.

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

The documentation separates principles, architecture, scope/limits, result semantics, profiles, evidence, counterexamples, adapters, threat model, maturity, provenance, runtime validation records, transport validation records, and ADRs.

## Contributing

Bring a runtime, an action boundary, a profile, a transport differential, or a smaller counterexample.

Before contributing, read [`CONTRIBUTING.md`](./CONTRIBUTING.md). Potentially sensitive upstream findings should follow [`SECURITY.md`](./SECURITY.md) before public disclosure.

## License

Apache License 2.0. See [`LICENSE`](./LICENSE).

---

**ActionSeam** · an open-source project by **WM3 Digital**
