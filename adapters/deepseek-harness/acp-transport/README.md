# DeepSeek Harness ACP stdio transport differential

**Transport status: PARTIAL for the exact JSON-RPC stdio baseline and the verified one-shot permission sub-surface described below.**

This directory tests transport semantics separately from the seven-profile DeepSeek Harness RuntimeTarget claim. A transport result does not silently upgrade runtime-profile coverage.

## Exact public subject

- upstream source snapshot: `deepseek-ai/deepseek-harness@99f6f02fecdb7dff40c3fbc9470f5907c29f74ca`;
- transport package: `@deepseek-ai/dsh-acp@0.1.0-rc.7`;
- approval package: `@deepseek-ai/dsh-user-approval@0.1.0-rc.7`;
- official client: `@agentclientprotocol/sdk@0.25.1`;
- runtime composition: public DSH Agent spine / AgentLoop / ToolRuntime at `0.1.0-rc.7`;
- install: `npm ci` from this directory's committed isolated lockfile.

The promoted ACP paths are not in-memory test streams. The harness spawns real Node child processes and exchanges JSON-RPC frames over stdin/stdout using the official ACP SDK.

## Baseline semantic fixture

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

The ActionTarget is deliberately permissive. The purpose is transport preservation, not action-boundary validation.

## Promoted baseline evidence

GitHub Actions run `32205337074` tested ActionSeam head `205d992c164fd06b76aef79cc66012861c98f782` using the committed transport lockfile and `npm ci`.

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

The baseline negative control changes the committed effect value by `+1000`; the comparator detects `synthetic-effect` and fails closed.

## One-shot permission differential

The permission gate exercises the same public DSH approval seam on two paths:

1. direct ToolRuntime + `@deepseek-ai/dsh-user-approval`, with a same-process deterministic decision;
2. real ACP stdio, where the published bridge maps that request to `session/request_permission` and the official ACP SDK returns the selected one-shot option.

Both `allow-once` and `reject-once` are tested independently against the same synthetic tool/effect.

### Promoted permission evidence

GitHub Actions run `32206488629` tested ActionSeam head `af8558cb17c414a3fcb39008b43897b3734e384d` using the committed transport lockfile and `npm ci`.

- artifact id: `9349296445`;
- artifact digest: `sha256:b9cd1c5161dd3dc2a2098b76e2712fad441dd6531528c52dbb59121b03fec217`.

#### `allow-once`

Direct and ACP both observe:

```text
approval outcome: allowed-once
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

#### `reject-once`

Direct and ACP both observe:

```text
approval outcome: rejected
tool executions: 0
committed effect: none
final text: actionseam-transport-complete
network model calls: 0
```

The same exact two wire options and tool-call identity are observed.

### Permission negative control

The comparator takes the real ACP `reject-once` result and deliberately injects the real `allow-once` tool execution/effect into it.

Observed:

```text
negative control detected: true
mismatches:
  tool-executions
  effect
```

A comparator that treated a rejected ACP permission as equivalent after an effect appeared would fail the CI job.

## Why process termination is not part of the claim

The first baseline probe exposed a teardown hang after the transport work had already completed. The accepted harness places explicit deadlines on claimed phases and terminates the child deterministically after evidence is captured.

`graceful process shutdown` remains explicitly outside the transport claim. This prevents an unverified lifecycle property from being hidden under a transport PASS.

## Proven scope

Current ACP transport evidence supports only:

- JSON-RPC stdio over a real child-process boundary;
- `initialize` with the observed capability advertisement;
- `session/new` with an absolute cwd;
- one deterministic text `session/prompt`;
- `end_turn` settlement;
- committed `agent_message_chunk` delivery;
- stdout protocol purity;
- preservation of exact material synthetic tool arguments/effect semantics for the baseline;
- `session/request_permission` for one-shot allow and reject decisions;
- exact session/tool-call identity in the permission request;
- exact `allow_once` and `reject_once` option mapping;
- allow-once commits one matching effect;
- reject-once commits no effect;
- zero network model-provider calls.

## Not claimed

This `PARTIAL` transport result does **not** claim:

- graceful process shutdown;
- cancelled permission-response differential;
- `session/cancel` differential;
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
```
