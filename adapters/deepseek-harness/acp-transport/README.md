# DeepSeek Harness ACP stdio transport differential

**Transport status: PARTIAL for one exact JSON-RPC stdio scenario.**

This directory tests transport semantics separately from the seven-profile DeepSeek Harness RuntimeTarget claim.

## Exact public subject

- upstream source snapshot: `deepseek-ai/deepseek-harness@99f6f02fecdb7dff40c3fbc9470f5907c29f74ca`;
- transport package: `@deepseek-ai/dsh-acp@0.1.0-rc.7`;
- official client: `@agentclientprotocol/sdk@0.25.1`;
- runtime composition: public DSH Agent spine / AgentLoop / ToolRuntime at `0.1.0-rc.7`;
- install: `npm ci` from this directory's committed isolated lockfile.

The promoted ACP path is not an in-memory test stream. `differential.js` spawns `server.js` as a real Node child process and exchanges JSON-RPC frames over the child's stdin/stdout using the official ACP SDK.

## Differential fixture

Direct and ACP paths receive the same deterministic user text and expose the same ActionSeam synthetic tool:

```text
input
  Execute the ActionSeam ACP transport differential exactly once.

tool arguments
  tenant   = tenant-A
  resource = transport-account-A
  amount   = 7

expected effect
  one tool execution
  revision = 1
  value    = 7

final text
  actionseam-transport-complete
```

The ActionTarget is deliberately permissive. The purpose of this test is transport preservation, not action-boundary validation.

## Promoted evidence

GitHub Actions run `32205337074` tested ActionSeam head `205d992c164fd06b76aef79cc66012861c98f782` using the committed transport lockfile and `npm ci`.

Workflow artifact:

- artifact id: `9348915317`;
- artifact digest: `sha256:85481ca768c6402aa0849883f1e386b8ea0902cb66099da50d750df613c3a8d0`.

Observed direct path:

```text
model requests: 2
network model calls: 0
tool executions: 1
arguments: tenant-A / transport-account-A / 7
committed effect: revision 1 / value 7
final text: actionseam-transport-complete
```

Observed ACP stdio path:

```text
initialize: success
advertised prompt capabilities: image=false, audio=false, embeddedContext=false
session/new: success
session/prompt: end_turn
committed update: agent_message_chunk
tool executions: 1
arguments: tenant-A / transport-account-A / 7
committed effect: revision 1 / value 7
final text: actionseam-transport-complete
stdout frames: 4
stdout protocol purity: true
stderr bytes: 0
network model calls: 0
```

Direct-vs-ACP result:

```text
PASS
mismatches: []
```

## Negative control

The comparator is not allowed to pass merely because both paths completed. After the real ACP result is captured, the control deliberately changes the committed effect value by `+1000` and re-runs the semantic comparator.

Observed:

```text
negative control detected: true
mismatch: synthetic-effect
```

A comparator that failed to detect that corruption would fail the CI job.

## Why process termination is not part of the claim

The first probe exposed a teardown hang after the transport work had already completed. The accepted harness therefore places explicit deadlines on `initialize`, `session/new`, `session/prompt`, and evidence read, then terminates the child deterministically after evidence is captured.

`graceful process shutdown` is explicitly outside this V0 transport claim. This prevents a lifecycle property that was not requested from being confused with transport equivalence.

## Proven scope

This ACP transport evidence supports only:

- JSON-RPC stdio over a real child-process boundary;
- `initialize` with the observed capability advertisement;
- `session/new` for a fresh session with an absolute cwd;
- `session/prompt` for one deterministic text prompt;
- `end_turn` settlement;
- committed `agent_message_chunk` delivery;
- stdout protocol purity;
- preservation of the exact material synthetic tool arguments;
- one tool execution;
- preservation of committed synthetic effect semantics relative to the direct path;
- zero network model-provider calls.

## Not claimed

This V0 transport result does **not** claim:

- graceful process shutdown;
- `session/request_permission` differential;
- `session/cancel` differential;
- multi-session isolation;
- image prompts;
- MCP equivalence;
- HTTP transport;
- Web/GUI RPC equivalence;
- CLI/package behavior beyond this exact Node child process using the published ACP plugin;
- execution of all seven ActionSeam DSH runtime profiles over ACP;
- production safety.

A `PARTIAL` transport result is a scoped transport result, not a blanket upgrade of the runtime-profile matrix.

## Reproduce

From this directory on Node.js 22+:

```bash
npm ci --ignore-scripts --no-audit --no-fund
node differential.js
```
