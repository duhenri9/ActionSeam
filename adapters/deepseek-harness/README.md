# DeepSeek Harness adapter

**Overall status: PARTIAL, with runtime-profile and transport evidence tracked independently.**

ActionSeam targets the public DeepSeek Harness `0.1.0-rc.7` release at source snapshot `99f6f02fecdb7dff40c3fbc9470f5907c29f74ca`.

## Evidence dimensions

| Dimension | Current scope |
| --- | --- |
| runtime-profile conformance | `PARTIAL` — 7 explicitly homologated ActionSeam profiles on public DSH runtime surfaces |
| ACP JSON-RPC stdio transport | `PARTIAL` — real child-process baseline + one-shot `session/request_permission` allow/reject + pre-tool-dispatch `session/cancel` |

These dimensions do not inherit from each other. The ACP transport result does **not** mean the seven runtime profiles were executed over ACP.

## Runtime composition

The base candidate boots the real published `@deepseek-ai/dsh-agent-spine-demo@0.1.0-rc.7` inside a public Cordis `Context`. That spine mounts the real DSH LLM runtime, Session store, ToolRuntime, Agent registry, Invariant registry, AgentLoop, and package-owned AgentLoop invariant companion.

ActionSeam registers deterministic synthetic `LlmAdapter` implementations using the documented `ctx.llm.registerAdapter(...)` extension point. They make zero network model-provider calls and replace only provider responses; they do not replace DSH's AgentLoop, Session, ToolRuntime, guard pipeline, validation, cancellation channel, or invariant services.

For the two later runtime profiles, `runtime-extended.js` keeps the already-homologated five-profile runtime unchanged and adds profile-specific public compositions. It mounts published `@deepseek-ai/dsh-user-approval` where approval semantics are required and directly exercises public `ctx.tools.execute` where argument integrity is the property under test.

The ActionSeam synthetic effect is exposed as a real DSH tool using public `defineTool(...)` / `ctx.tools.register(...)`. Its body delegates the effect to the supplied ActionSeam `ActionTarget`, keeping committed state synthetic while exercising DSH's real tool path.

## Runtime dependency freeze

The runtime adapter is frozen by `package-lock.json` and installed with `npm ci`:

- `@deepseek-ai/cordis@4.0.1`;
- `@deepseek-ai/dsh-agent-spine-demo@0.1.0-rc.7`;
- `@deepseek-ai/dsh-llm@0.1.0-rc.7`;
- `@deepseek-ai/dsh-tools@0.1.0-rc.7`;
- `@deepseek-ai/dsh-user-approval@0.1.0-rc.7`.

No package-private DSH test helper or source import is used.

## Seven-profile runtime evidence

Promoted mechanism/matrix evidence:

- ActionSeam head: `6758d7bd67e846f78681bc6f846cdfceb252d621`;
- GitHub Actions run: `32204164840`;
- artifact id: `9348539981`;
- artifact digest: `sha256:7f047ab24ebaf72e4cc68693da447af02182924811d14908ee8fdb09915bb1f6`.

```text
DeepSeekHarnessExtendedRuntime → PermissiveActionTarget
PASS 7 / FAIL 0
report digest: sha256:56affd3e90ac1a7d6aab2d2ee26f6f766ef6a34df99e2fc485ae5c0b70977f38

KnownBadRuntime → PermissiveActionTarget
PASS 0 / FAIL 7
report digest: sha256:efff30484a751ceb4602a67dceb382c0cafbc936b2fd922f2c291db234a8939a
```

The ActionTarget is deliberately permissive in both rows, so it cannot rescue runtime failures.

Evidence-backed profiles:

- `authority.approval-one-shot.v1` — real `dsh-user-approval` one-shot lifecycle;
- `authority.monotonic-deny.v1` — final `ctx.tools.guard()` veto;
- `contracts.input-validation.v1` — ToolRuntime `INVALID_ARGS` before body execution;
- `contracts.argument-immutability.v1` — lossless snapshot/deep-freeze before policy/dispatch wrappers;
- `contracts.output-validation.v1` — ToolRuntime `INVALID_TOOL_OUTPUT`;
- `authority.untrusted-context.v1` — adversarial allow cannot defeat the final guard;
- `reconstruction.model-visible.v1` — AgentLoop durable reconstruction invariant plus ActionSeam structural verification.

### One-shot approval evidence

```text
call 1: account-A
approval/asked → approval/decided: allowed-once
body/effect executes once

call 2: materially changed to account-B
approval/asked → approval/decided: rejected
no second body/effect
```

### Argument immutability evidence

A public `tools/execute` wrapper attempts `amount: 50 → 500` after ToolRuntime materialization:

- `Object.isFrozen(exec.arguments) === true`;
- mutation raises `TypeError`;
- before/after digests are identical;
- `mutationApplied: false`;
- committed delta remains `50`.

## ACP JSON-RPC stdio transport evidence

Transport lives in the isolated [`acp-transport/`](./acp-transport/) package with its own frozen lockfile.

Exact subject:

- `@deepseek-ai/dsh-acp@0.1.0-rc.7`;
- `@deepseek-ai/dsh-user-approval@0.1.0-rc.7` for the permission sub-surface;
- official `@agentclientprotocol/sdk@0.25.1`;
- real Node child processes;
- JSON-RPC over stdin/stdout;
- zero network model-provider calls.

### Promoted baseline

- head: `205d992c164fd06b76aef79cc66012861c98f782`;
- run: `32205337074`;
- artifact: `9348915317`;
- digest: `sha256:85481ca768c6402aa0849883f1e386b8ea0902cb66099da50d750df613c3a8d0`.

Direct and ACP both preserve exactly one execution of `tenant-A / transport-account-A / amount 7`, revision `1`, value `7`, final text `actionseam-transport-complete`, and zero network model calls. ACP additionally proves `initialize`, `session/new`, `session/prompt`, `end_turn`, committed `agent_message_chunk`, and stdout protocol purity. A corrupted-effect `+1000` negative control is detected as `synthetic-effect`.

### Promoted one-shot permission differential

- head: `af8558cb17c414a3fcb39008b43897b3734e384d`;
- run: `32206488629`;
- artifact: `9349296445`;
- digest: `sha256:b9cd1c5161dd3dc2a2098b76e2712fad441dd6531528c52dbb59121b03fec217`.

The same public DSH ToolRuntime `ask` seam is exercised directly and over real ACP stdio.

`allow-once`:

```text
ACP method: session/request_permission
session id: exact active ACP session
toolCallId: actionseam-transport-call-1
options: allow-once/allow_once, reject-once/reject_once
DSH outcome: allowed-once
tool executions: 1
committed effect: revision 1 / value 7
```

`reject-once`:

```text
same exact permission request identity/options
DSH outcome: rejected
tool executions: 0
committed effect: none
```

Both direct-vs-ACP permission cases pass with no mismatches. The negative control injects the real allow effect into the real reject result; the comparator detects both `tool-executions` and `effect` divergence.

### Promoted pre-tool-dispatch `session/cancel` differential

- head: `14887ba2ee459f0456b372e4587c6b9f4a28b641`;
- run: `32244037178`;
- artifact: `9361890402`;
- digest: `sha256:b891e60fc9be5fd8e42a0663fabc8b361479b6c5b0a7255eba6775676cd71e4f`.

The cancellation probe first confirms the synthetic model request is genuinely in flight and has a DSH `AbortSignal`, while deliberately blocking before any tool call is emitted. It then compares direct public Agent cancellation with a real ACP `session/cancel` notification for the exact active session.

Both paths observe:

```text
model started: true
model AbortSignal observed: true
network model calls: 0
tool executions: 0
synthetic effects: 0
cancel settles: true
```

ACP additionally observes:

```text
method: session/cancel
notification: true
exact active session targeted: true
original session/prompt stopReason: cancelled
stdout JSON-RPC pure: true
stderr bytes: 0
```

The negative control injects a synthetic post-cancel tool execution and effect; the comparator detects `toolExecutions` and `effectCount` mismatches.

This claim is **pre-tool-dispatch only**. It does not establish rollback after a tool starts, rollback of committed effects, or cancellation of a non-cooperative running tool.

### Final reviewed regression

GitHub Actions run `32245848133` at head `3bdeaa96b63451d41520029972313b009f9dc325` passed all five repository jobs after the cancellation gate's review hardening. The ACP artifact is `9362531859`, digest `sha256:54f0ca50be1f5cbaa95885e413de20f5de03be91b2c6bd9df3b3d46fc7d5f7e6`.

The reviewed harness also keeps early cancellation-observation failures fail-closed, tracks in-flight prompt rejection before teardown, and writes cross-process evidence atomically so a partial JSON record cannot be accepted.

See [`acp-transport/README.md`](./acp-transport/README.md) for the complete transport evidence and reproduction commands.

## Still not claimed — runtime profiles

These profiles remain outside the DSH runtime-profile `PARTIAL` claim:

- `authority.approval-binding.v1`;
- `identity.external-principal.v1`;
- `effects.idempotent-retry.v1`;
- `effects.stale-revision.v1`;
- `isolation.tenant-boundary.v1`;
- `isolation.secret-canary.v1`.

## Still not claimed — transport/protocol surfaces

Current ACP transport evidence does not claim:

- graceful process shutdown;
- cancelled permission-response equivalence;
- rollback after a tool body has started;
- rollback of a committed effect;
- cancellation of a non-cooperative running tool;
- multi-session isolation;
- image prompts;
- all seven runtime profiles over ACP;
- MCP equivalence;
- HTTP transport;
- Web/GUI RPC equivalence;
- CLI/package behavior beyond the exact ACP child processes;
- production safety.

Other system-wide exclusions remain: real network model providers, production identity/tenant semantics, production filesystem/shell/sandbox safety, distributed effect semantics, and framework-wide certification.

## Reproduce runtime-profile evidence

From `adapters/deepseek-harness/`:

```bash
npm ci --ignore-scripts --no-audit --no-fund
npm run verify
node probe.js
node round-trip.js
node boundary-probe.js
node matrix.js
```

## Reproduce ACP transport evidence

From `adapters/deepseek-harness/acp-transport/`:

```bash
npm ci --ignore-scripts --no-audit --no-fund
node differential.js
node permission-differential.js
node cancel-differential.js
```
