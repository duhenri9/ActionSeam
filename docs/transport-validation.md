# Transport validation record

Transport evidence is recorded separately from runtime-profile conformance so one dimension cannot silently upgrade the other.

## 2026-08-19 — DeepSeek Harness ACP JSON-RPC stdio V0

Exact upstream:

- source snapshot: `deepseek-ai/deepseek-harness@99f6f02fecdb7dff40c3fbc9470f5907c29f74ca`;
- transport package: `@deepseek-ai/dsh-acp@0.1.0-rc.7`;
- official client SDK: `@agentclientprotocol/sdk@0.25.1`.

Promoted ActionSeam evidence:

- tested head: `205d992c164fd06b76aef79cc66012861c98f782`;
- GitHub Actions run: `32205337074`;
- artifact id: `9348915317`;
- artifact digest: `sha256:85481ca768c6402aa0849883f1e386b8ea0902cb66099da50d750df613c3a8d0`;
- install mode: `npm ci` from the committed isolated `acp-transport/package-lock.json`.

### Boundary under test

The ACP subject is a real Node child process. ActionSeam drives it using the official ACP SDK over the child's stdin/stdout JSON-RPC streams. No DSH in-memory test stream or package-private test helper is used as promoted transport proof.

The same semantic fixture runs first on a direct published DSH AgentLoop/ToolRuntime path and then on ACP:

```text
user input
  Execute the ActionSeam ACP transport differential exactly once.

tool arguments
  tenant   = tenant-A
  resource = transport-account-A
  amount   = 7

expected committed effect
  one tool execution
  revision = 1
  value    = 7

expected final answer
  actionseam-transport-complete
```

Both paths use an ActionSeam deterministic public LLM adapter and make zero network model-provider calls.

### Direct observation

```text
model requests: 2
network model calls: 0
tool executions: 1
arguments: tenant-A / transport-account-A / 7
committed effect: revision 1 / value 7
final text: actionseam-transport-complete
```

### ACP stdio observation

```text
protocol version: 1
initialize: success
prompt capabilities: image=false, audio=false, embeddedContext=false
session/new: success
session/prompt: end_turn
committed update types: [agent_message_chunk]
permission requests: 0
tool executions: 1
arguments: tenant-A / transport-account-A / 7
committed effect: revision 1 / value 7
final text: actionseam-transport-complete
stdout frames: 4
stdout protocol purity: true
stderr bytes: 0
network model calls: 0
```

### Differential result

```text
PASS
mismatches: []
```

### Negative control

After the real ACP result is captured, ActionSeam deliberately changes the committed effect value by `+1000` and re-runs the comparator.

```text
negative control detected: true
mismatch: synthetic-effect
```

### Teardown finding

An earlier probe completed the transport work but hung during child-process teardown. The promoted harness therefore makes lifecycle scope explicit:

- `initialize`, `session/new`, `session/prompt`, and evidence read have fail-closed deadlines;
- after all claimed evidence is captured, the child is terminated deterministically;
- graceful shutdown is not part of the V0 ACP transport claim.

## 2026-08-19 — ACP one-shot permission differential

This gate extends only the verified ACP permission sub-surface. It does not alter the seven-profile runtime matrix and does not imply other ACP methods are equivalent.

Exact public components:

- `@deepseek-ai/dsh-acp@0.1.0-rc.7`;
- `@deepseek-ai/dsh-user-approval@0.1.0-rc.7`;
- `@agentclientprotocol/sdk@0.25.1`;
- same upstream snapshot `99f6f02fecdb7dff40c3fbc9470f5907c29f74ca`.

Promoted evidence:

- tested head: `af8558cb17c414a3fcb39008b43897b3734e384d`;
- GitHub Actions run: `32206488629`;
- artifact id: `9349296445`;
- artifact digest: `sha256:b9cd1c5161dd3dc2a2098b76e2712fad441dd6531528c52dbb59121b03fec217`;
- install mode: `npm ci` from the committed isolated transport lockfile.

### Differential shape

The same ToolRuntime `ask` seam and the same ActionSeam synthetic tool/effect are exercised on:

1. a direct public DSH path where a deterministic same-process approval listener returns the one-shot decision;
2. the real ACP child-process path where the published bridge emits `session/request_permission` and the official ACP SDK selects the requested option.

Both `allow-once` and `reject-once` are tested independently.

### `allow-once`

Direct and ACP both observe:

```text
DSH approval outcome: allowed-once
tool executions: 1
committed effect: revision 1 / value 7
final text: actionseam-transport-complete
network model calls: 0
```

ACP wire evidence:

```text
method: session/request_permission
session id: exact active ACP session id
tool call id: actionseam-transport-call-1
options:
  allow-once  / allow_once
  reject-once / reject_once
```

The direct-vs-ACP semantic comparator returns `PASS` with no mismatches.

### `reject-once`

Direct and ACP both observe:

```text
DSH approval outcome: rejected
tool executions: 0
committed effect: none
final text: actionseam-transport-complete
network model calls: 0
```

The same exact ACP session id, tool call id, and one-shot option set are observed. The comparator again returns `PASS` with no mismatches.

### Permission negative control

ActionSeam takes the real ACP `reject-once` result and deliberately injects the real `allow-once` tool execution/effect into it.

```text
negative control detected: true
mismatches:
  tool-executions
  effect
```

## 2026-08-19 — ACP `session/cancel` pre-tool-dispatch differential

This gate verifies a deliberately narrow cancellation interval: the model request is already in flight, but no tool call has been emitted and no effect has started.

Exact public components:

- `@deepseek-ai/dsh-acp@0.1.0-rc.7`;
- public DSH Agent cancellation lifecycle;
- public `GenerateOptions.signal` / `AbortSignal` channel;
- `@agentclientprotocol/sdk@0.25.1`;
- same upstream snapshot `99f6f02fecdb7dff40c3fbc9470f5907c29f74ca`.

Promoted mechanism evidence:

- tested head: `14887ba2ee459f0456b372e4587c6b9f4a28b641`;
- GitHub Actions run: `32244037178`;
- artifact id: `9361890402`;
- artifact digest: `sha256:b891e60fc9be5fd8e42a0663fabc8b361479b6c5b0a7255eba6775676cd71e4f`;
- install mode: `npm ci` from the committed isolated transport lockfile.

### Differential shape

ActionSeam uses an independently authored deterministic `LlmAdapter` that:

- receives the real DSH model request;
- proves the expected prompt and tool schema are visible;
- proves a live `AbortSignal` is present;
- records that the model request has started;
- blocks before any tool-call chunk is emitted;
- records the later signal abort.

The same cancellation point is exercised directly and over a real ACP child process.

### Direct observation

```text
model started: true
model AbortSignal observed: true
turn end: aborted / user
network model calls: 0
tool executions: 0
synthetic effects: 0
cancel settles: true
```

### ACP observation

```text
model started: true
model AbortSignal observed: true
method: session/cancel
notification: true
exact active ACP session targeted: true
original session/prompt stopReason: cancelled
network model calls: 0
tool executions: 0
synthetic effects: 0
stdout JSON-RPC pure: true
stderr bytes: 0
```

The direct-vs-ACP comparator returns:

```text
PASS
mismatches: []
```

### Cancellation negative control

After the real ACP result is captured, ActionSeam deliberately injects a synthetic post-cancel tool execution and effect.

```text
negative control detected: true
mismatches:
  toolExecutions
  effectCount
```

The comparator therefore does not confuse “a cancel notification was sent” with “no action crossed the verified pre-dispatch boundary”.

### Claim boundary

This evidence supports only **pre-tool-dispatch cancellation**. It does not support claims about:

- rollback after a tool body has started;
- rollback of a committed effect;
- cancellation of a non-cooperative running tool.

### Final regression after promotion

GitHub Actions run `32244308363` at head `4d13991fd9abe49c9879c196bd866c3614fc7d50` passed all five repository jobs after provenance promotion:

- `public-history-secret-scan`;
- `reference-conformance`;
- `invokta-action-target`;
- `deepseek-harness-public-probe`;
- `deepseek-harness-acp-transport-probe`.

The ACP artifact from that regression is `9361984278`, digest `sha256:1145978a27795343047fe386ceef3ec346022fc0f1f22b548954de4424055cce`.

## Resulting transport claim

`ACP JSON-RPC stdio: PARTIAL` now covers three separately evidenced slices:

1. the exact baseline text/tool/effect/final-answer differential;
2. `session/request_permission` one-shot allow/reject mapping for that synthetic tool boundary;
3. pre-tool-dispatch `session/cancel` with model abort propagation, exact-session targeting, `cancelled` prompt settlement, and zero tool/effect execution.

It still does **not** imply:

- cancelled permission-response equivalence;
- rollback after a tool body has started;
- rollback of committed effects;
- cancellation of a non-cooperative running tool;
- multi-session isolation;
- image prompt support;
- graceful process shutdown;
- all seven DSH runtime profiles over ACP;
- MCP equivalence;
- HTTP transport support;
- Web/GUI RPC equivalence;
- production safety.

Each remaining sub-surface requires its own executable gate before becoming a claim.
