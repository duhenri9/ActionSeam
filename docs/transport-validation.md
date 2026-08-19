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

The ACP subject is a real Node child process. ActionSeam drives it using the official ACP SDK over the child's stdin/stdout JSON-RPC streams. No DSH in-memory test stream or package-private test helper is used as the promoted transport proof.

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

Observed frame classes were three successful responses and one `session/update` notification.

### Differential result

```text
PASS
mismatches: []
```

The comparator checks input admission, terminal committed text, normalized synthetic effect semantics, and network-model-call count.

### Negative control

After the real ACP result is captured, ActionSeam deliberately changes the committed effect value by `+1000` and re-runs the comparator.

```text
negative control detected: true
mismatch: synthetic-effect
```

This control demonstrates that the transport differential is not a completion-only or self-equality test.

### Teardown finding

An earlier probe completed the transport work but hung during child-process teardown. The promoted harness therefore makes lifecycle scope explicit:

- `initialize`, `session/new`, `session/prompt`, and evidence read have fail-closed deadlines;
- after all claimed evidence is captured, the child is terminated deterministically;
- graceful shutdown is not part of the V0 ACP transport claim.

This is not hidden as a PASS: the untested lifecycle property is named and excluded.

## Resulting transport claim

`ACP JSON-RPC stdio: PARTIAL` means only that the exact fixture above preserves its material semantics across the real published ACP stdio boundary.

It does not imply:

- `session/request_permission` equivalence;
- `session/cancel` equivalence;
- multi-session isolation;
- image prompt support;
- graceful process shutdown;
- all seven DSH runtime profiles over ACP;
- MCP equivalence;
- HTTP transport support;
- Web/GUI RPC equivalence;
- production safety.

Each of those requires its own executable gate before becoming a claim.
