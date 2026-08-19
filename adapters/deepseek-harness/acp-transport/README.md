# DeepSeek Harness ACP stdio transport differential

**Transport status: PARTIAL for three separately evidenced JSON-RPC stdio slices: baseline semantics, one-shot permission allow/reject, and pre-tool-dispatch `session/cancel`.**

This directory tests transport semantics separately from the seven-profile DeepSeek Harness RuntimeTarget claim. A transport result does not silently upgrade runtime-profile coverage.

## Exact public subject

- upstream source snapshot: `deepseek-ai/deepseek-harness@99f6f02fecdb7dff40c3fbc9470f5907c29f74ca`;
- transport package: `@deepseek-ai/dsh-acp@0.1.0-rc.7`;
- approval package: `@deepseek-ai/dsh-user-approval@0.1.0-rc.7`;
- official client: `@agentclientprotocol/sdk@0.25.1`;
- runtime composition: public DSH Agent spine / AgentLoop / ToolRuntime at `0.1.0-rc.7`;
- install: `npm ci` from this directory's committed isolated lockfile.

The promoted ACP paths are not in-memory test streams. ActionSeam spawns real Node child processes and exchanges JSON-RPC frames over stdin/stdout using the official ACP SDK. Synthetic LLM adapters are independently authored by ActionSeam, use the public DSH `LlmAdapter` contract, and make zero network model-provider calls.

## Baseline semantic differential

Direct and ACP paths receive the same deterministic input and expose the same ActionSeam synthetic tool.

Promoted evidence:

- tested head: `205d992c164fd06b76aef79cc66012861c98f782`;
- GitHub Actions run: `32205337074`;
- artifact id: `9348915317`;
- artifact digest: `sha256:85481ca768c6402aa0849883f1e386b8ea0902cb66099da50d750df613c3a8d0`.

Both paths produce:

```text
model-provider network calls: 0
tool executions: 1
arguments: tenant-A / transport-account-A / 7
committed effect: revision 1 / value 7
final text: actionseam-transport-complete
```

ACP additionally proves `initialize`, `session/new`, `session/prompt`, `end_turn`, committed `agent_message_chunk` delivery, and stdout JSON-RPC purity. The baseline negative control changes the committed effect value by `+1000`; the comparator detects `synthetic-effect`.

## One-shot permission differential

The same public DSH ToolRuntime `ask` seam is exercised directly and over real ACP stdio.

Promoted evidence:

- tested head: `af8558cb17c414a3fcb39008b43897b3734e384d`;
- GitHub Actions run: `32206488629`;
- artifact id: `9349296445`;
- artifact digest: `sha256:b9cd1c5161dd3dc2a2098b76e2712fad441dd6531528c52dbb59121b03fec217`.

### `allow-once`

```text
ACP method: session/request_permission
session id: exact active ACP session id
tool call id: actionseam-transport-call-1
options: allow-once/allow_once, reject-once/reject_once
DSH outcome: allowed-once
tool executions: 1
committed effect: revision 1 / value 7
```

### `reject-once`

```text
same exact request identity/options
DSH outcome: rejected
tool executions: 0
committed effect: none
```

Both direct-vs-ACP permission cases pass with no mismatches. The negative control injects the real allow effect into the reject result; the comparator detects both `tool-executions` and `effect` divergence.

## Pre-tool-dispatch `session/cancel` differential

This gate is intentionally narrower than a generic cancellation or rollback claim.

ActionSeam starts the same deterministic prompt on two paths:

1. direct public DSH Agent cancellation;
2. a real ACP child process where the official SDK sends `session/cancel` to the exact active session.

The synthetic LLM request first proves that it is genuinely in flight and has received the public DSH `AbortSignal`. It blocks **before emitting any tool call**. Cancellation is then requested.

Promoted mechanism evidence:

- tested head: `14887ba2ee459f0456b372e4587c6b9f4a28b641`;
- GitHub Actions run: `32244037178`;
- artifact id: `9361890402`;
- artifact digest: `sha256:b891e60fc9be5fd8e42a0663fabc8b361479b6c5b0a7255eba6775676cd71e4f`;
- install mode: `npm ci` from the committed isolated transport lockfile.

Observed on both direct and ACP paths:

```text
model request in flight before cancellation: true
DSH model AbortSignal observed: true
network model calls: 0
tool executions: 0
synthetic effects: 0
cancel settles: true
```

ACP-specific wire evidence:

```text
method: session/cancel
notification: true
target: exact active ACP session id
original session/prompt stopReason: cancelled
stdout JSON-RPC pure: true
stderr bytes: 0
```

The comparator reports `PASS` with no semantic mismatches.

### Cancellation negative control

After the real ACP cancellation result is captured, ActionSeam deliberately injects a synthetic post-cancel tool execution and effect. The comparator must reject it.

Observed:

```text
negative control detected: true
mismatches:
  toolExecutions
  effectCount
```

This proves the gate is not merely checking that a `session/cancel` frame was sent or that the prompt eventually returned.

### Cancellation claim boundary

The evidence supports **pre-tool-dispatch cancellation only**. It does not claim:

- rollback after a tool body has started;
- rollback of a committed external effect;
- cancellation of a non-cooperative tool already running.

Those are different properties and require different executable gates.

## Final reviewed regression after cancellation promotion

After review hardening, GitHub Actions run `32245848133` re-ran the complete repository gate at head `3bdeaa96b63451d41520029972313b009f9dc325`.

All five jobs passed:

- `public-history-secret-scan`;
- `reference-conformance`;
- `invokta-action-target`;
- `deepseek-harness-public-probe`;
- `deepseek-harness-acp-transport-probe`.

The ACP artifact from that final reviewed gate is `9362531859`, digest `sha256:54f0ca50be1f5cbaa95885e413de20f5de03be91b2c6bd9df3b3d46fc7d5f7e6`.

Three reliability findings were fixed before merge: early adapter/callback failures now reject both cancellation observation channels, the in-flight ACP prompt rejection is tracked before teardown, and cross-process evidence is published atomically so a partial JSON record cannot be accepted.

## Why process termination is not part of the claim

An earlier baseline probe completed the transport work but hung during child-process teardown. The accepted harness places explicit deadlines on claimed phases and terminates the child deterministically after evidence is captured.

`graceful process shutdown` remains explicitly outside the transport claim. This prevents an unverified lifecycle property from being hidden under a transport PASS.

## Proven scope

Current ACP transport evidence supports only:

- JSON-RPC stdio over real child-process boundaries;
- `initialize` with the observed capability advertisement;
- `session/new` with an absolute cwd;
- deterministic text `session/prompt`;
- baseline `end_turn` settlement and committed `agent_message_chunk` delivery;
- stdout JSON-RPC purity;
- preservation of exact material synthetic tool arguments/effect semantics for the baseline;
- `session/request_permission` one-shot allow/reject mapping with exact session/tool-call identity;
- pre-tool-dispatch `session/cancel` targeting the exact active session;
- DSH model abort propagation after cancellation;
- original ACP prompt settlement as `cancelled`;
- zero tool-body executions and zero synthetic effects in the verified cancellation window;
- zero network model-provider calls.

## Not claimed

This `PARTIAL` transport result does **not** claim:

- graceful process shutdown;
- cancelled permission-response equivalence;
- rollback after a tool body has started;
- rollback of a committed effect;
- cancellation of a non-cooperative running tool;
- multi-session isolation;
- image prompts;
- MCP equivalence;
- HTTP transport;
- Web/GUI RPC equivalence;
- CLI/package behavior beyond the exact Node child processes using the published ACP plugin;
- execution of all seven ActionSeam DSH runtime profiles over ACP;
- production safety.

## Reproduce

From this directory on Node.js 22+:

```bash
npm ci --ignore-scripts --no-audit --no-fund
node differential.js
node permission-differential.js
node cancel-differential.js
```
