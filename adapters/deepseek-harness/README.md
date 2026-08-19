# DeepSeek Harness runtime adapter

**Status: PARTIAL / executable for the direct Agent spine + AgentLoop composition described below.**

This adapter targets the public DeepSeek Harness `0.1.0-rc.7` release at source snapshot `99f6f02fecdb7dff40c3fbc9470f5907c29f74ca`.

## What is actually running

The candidate boots the real published `@deepseek-ai/dsh-agent-spine-demo@0.1.0-rc.7` inside a public Cordis `Context`. That spine mounts the real DSH LLM runtime, Session store, Tool runtime, Agent registry, Invariant registry, AgentLoop, and the package-owned AgentLoop invariant companion.

ActionSeam registers a deterministic synthetic `LlmAdapter` through the documented `ctx.llm.registerAdapter(...)` extension point. The adapter emits deterministic DSH stream chunks, including a real tool call, so CI needs no provider credential and makes no DeepSeek/OpenAI/model-provider network call. The synthetic LLM replaces only the model provider; it does **not** replace or mock the DSH AgentLoop, Session, ToolRuntime, guard pipeline, output validation, or invariant services.

The ActionSeam synthetic effect is exposed as a real DSH tool using public `defineTool(...)` / `ctx.tools.register(...)`. Its body delegates the external effect to the ActionSeam `ActionTarget` supplied to `runtime.execute(...)`, keeping committed state synthetic while exercising DSH's actual tool dispatch path.

## Frozen published dependencies

The adapter probe and candidate are frozen by `package-lock.json` and installed with `npm ci`:

- `@deepseek-ai/cordis@4.0.1`;
- `@deepseek-ai/dsh-agent-spine-demo@0.1.0-rc.7`;
- `@deepseek-ai/dsh-llm@0.1.0-rc.7`;
- `@deepseek-ai/dsh-tools@0.1.0-rc.7`.

No package-private DSH test helper or source import is used.

## Executable evidence

GitHub Actions run `32202002968` tested ActionSeam code head `d171021639dce45532d624e42c41d5683e674ccb` with fail-closed evidence steps.

Workflow artifact:

- artifact id: `9347836831`;
- artifact digest: `sha256:3b761347bed2aa63416113c4ead0b907e02925dabd65838c2d5105d56b8eddc4`.

### Real AgentLoop round trip

The evidence records:

```text
synthetic public LlmAdapter
  → real DSH AgentLoop
  → real DSH ToolRuntime
  → tools/pre-execute
  → tool body exactly once
  → tools/result
  → durable session events
  → second AgentLoop model request
  → final assistant response
```

Observed high-signal facts include two LLM requests, one tool execution, `tools/pre-execute`, `tools/result`, and durable `turn/start`, `tool/call`, `tool/result`, and `turn/end` events, with zero network model calls.

### Tool-boundary probe

Direct public ToolRuntime probes established the actual upstream error semantics used by the adapter:

- malformed input: `INVALID_ARGS` / `ToolArgsError`, tool body calls `0`;
- malformed output: `INVALID_TOOL_OUTPUT` / `ToolOutputError`, tool body calls `1`;
- `tools/pre-execute` attempted allow followed by `ctx.tools.guard()` deny: final error, tool body calls `0`.

The CI commands write JSON directly before printing it; a failing Node process therefore fails the workflow instead of being masked by a pipeline.

## Five-profile differential matrix

The first RuntimeTarget matrix deliberately uses ActionSeam's `PermissiveActionTarget`, which provides no validating safety net. The same target is then used with `KnownBadRuntime` as the control.

```text
DeepSeekHarnessRuntime → PermissiveActionTarget
PASS 5 / FAIL 0
report digest: sha256:137b921d4fbb117e445e5ae2048f3406f4a80449a7a9dd5849acaf7367cffcc9

KnownBadRuntime → PermissiveActionTarget
PASS 0 / FAIL 5
report digest: sha256:94a8e301ba802279e7c23dc69096862e908165ceb4bd0cf84cba841f163942fa
```

The tested profiles are:

| Profile | DSH mechanism exercised | Attribution |
| --- | --- | --- |
| `authority.monotonic-deny.v1` | an ActionSeam test hook attempts `allow` at `tools/pre-execute`; DSH `ctx.tools.guard()` still denies before body execution | **DSH-owned final monotonic veto** |
| `contracts.input-validation.v1` | malformed string amount reaches real ToolRuntime and becomes `INVALID_ARGS` before body execution | **DSH-owned input validation** |
| `contracts.output-validation.v1` | permissive target commits and returns malformed output; DSH emits `INVALID_TOOL_OUTPUT` after body execution | **DSH-owned output validation** |
| `authority.untrusted-context.v1` | model-visible retrieved text triggers an ActionSeam test attempt to allow; DSH binding guard still denies with zero effect | **DSH-owned final guard; ActionSeam owns the adversarial allow attempt** |
| `reconstruction.model-visible.v1` | ActionSeam verifies the material inputs/tool in the actual request received by the public LLM adapter while the spine runs DSH's package-owned AgentLoop invariant against durable Session reconstruction | **DSH-owned durable reconstruction invariant + ActionSeam structural evidence check** |

The `5 / 0` result is scoped to this exact composition and these five profiles. It is not a five-point framework safety score.

## Not claimed in V0

The following ActionSeam profiles are **not** included in the DeepSeek Harness `PARTIAL` claim:

- `authority.approval-binding.v1`;
- `identity.external-principal.v1`;
- `effects.idempotent-retry.v1`;
- `effects.stale-revision.v1`;
- `isolation.tenant-boundary.v1`;
- `isolation.secret-canary.v1`.

Those properties need a DSH-owned control/observation surface or a separately justified composition before they can be tested without misattribution.

This V0 also does not claim:

- a real DeepSeek, OpenAI, or other network model-provider path;
- ACP, MCP, HTTP, CLI, browser, or UI transport differential;
- production identity-provider or tenant isolation semantics;
- production filesystem, shell, sandbox, or approval safety;
- distributed provider/effect semantics;
- framework-wide compatibility or production safety certification.

## Reproduce

From this directory on Node.js 22+:

```bash
npm ci --ignore-scripts --no-audit --no-fund
npm run verify
node probe.js
node round-trip.js
node boundary-probe.js
node matrix.js
```

`matrix.js` writes the DSH report, known-bad control report, Inspectors, and raw profile evidence under `artifacts/profile-matrix/`.
