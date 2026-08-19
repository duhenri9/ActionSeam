# Validation record

## 2026-08-19 — clean-room V0 pre-PR validation

Environment:

- Node.js `v22.16.0`;
- no third-party runtime or development dependencies;
- local clean-room directory created independently for ActionSeam.

Commands:

```bash
node --test
node src/cli.js demo --subject reference --out artifacts/reference
node src/cli.js demo --subject known-bad --out artifacts/known-bad
```

Observed:

```text
node --test
7 tests passed
0 failed

reference subject
PASS 11
FAIL 0

known-bad subject
PASS 0
FAIL 11
```

Reference report digest:

`sha256:38214cbd2c87ce1d46848817126903eb3b97cae50a475f9ca1cc2df8f0874ac6`

Known-bad report digest:

`sha256:166376aecc344a7d9a356fd5a9bfbcc9cdcbf2e0960fe15caafc2bd6b3076e7d`

These results cover only the clean-room reference subjects. They are not evidence for DeepSeek Harness, Invokta, or any production system.

## 2026-08-19 — Invokta 0.6.0 direct ActionTarget verification

GitHub Actions run `32198408794` tested ActionSeam head `54c1ccd66c1263ec39a1c128bcbb83b331fadb1d`, installed `@invokta/core@0.6.0` and `zod@4.4.3`, ran four adapter verification tests, and generated the current matrix reports.

Observed:

```text
adapter verification
4 tests passed
0 failed

ReferenceRuntime → InvoktaActionTarget@0.6.0
PASS 11
FAIL 0

KnownBadRuntime → InvoktaActionTarget@0.6.0
PASS 4
FAIL 7
```

Reference-runtime report digest:

`sha256:f5189883ecca3ff46515ecb7f3db55ea0b3715dabd6c0731196ec25f8a4f901a`

Known-bad-runtime report digest:

`sha256:03aa37c5a235685d2227b0b12fdd357a99dc242bef3e37e948ceecc83fb5c65b`

Workflow artifact:

- artifact id: `9346637326`;
- artifact digest: `sha256:ba6ad7f1b541af4299781f91643ca7db3b3f7176f9a7f2d40a039aa5d3b2fa82`.

### Attribution boundary

The `11 PASS / 0 FAIL` reference row is an end-to-end composition result, not eleven native Invokta guarantees.

Directly exercised Invokta enforcement in this adapter:

- input schema validation;
- output schema validation;
- capability `access` enforcement used by the tenant-boundary scenario.

The Invokta API also keeps `Principal` separate from business input, but ActionSeam's runtime remains responsible for deciding which principal is trusted.

ActionSeam-owned semantics in the same matrix include:

- stale-revision detection in the synthetic state provider, with adapter error normalization;
- effect-id reuse and provider deduplication for retry/idempotency;
- approval binding, monotonic deny, untrusted-context authority, model-visible reconstruction, and secret-canary handling in the runtime.

This evidence covers only the direct `engine.invoke` ActionTarget adapter. It is not evidence for Invokta CLI, MCP stdio, MCP HTTP, transport differential, a production identity provider, distributed provider semantics, or a production deployment.

The evidence pin intentionally names the last code-changing adapter head (`54c1ccd66c1263ec39a1c128bcbb83b331fadb1d`). Later documentation-only commits may re-run CI, but they do not retroactively change which adapter code produced the pinned report digests above.

## 2026-08-19 — DeepSeek Harness 0.1.0-rc.7 direct Agent-spine RuntimeTarget verification

GitHub Actions run `32202002968` tested ActionSeam head `d171021639dce45532d624e42c41d5683e674ccb` against the public DeepSeek Harness source/release snapshot `99f6f02fecdb7dff40c3fbc9470f5907c29f74ca`.

The frozen direct dependencies were:

- `@deepseek-ai/cordis@4.0.1`;
- `@deepseek-ai/dsh-agent-spine-demo@0.1.0-rc.7`;
- `@deepseek-ai/dsh-llm@0.1.0-rc.7`;
- `@deepseek-ai/dsh-tools@0.1.0-rc.7`.

The job used `npm ci` from the committed lockfile and fail-closed JSON evidence steps.

Workflow artifact:

- artifact id: `9347836831`;
- artifact digest: `sha256:3b761347bed2aa63416113c4ead0b907e02925dabd65838c2d5105d56b8eddc4`.

### Public bootstrap and real AgentLoop round trip

The ActionSeam deterministic synthetic LLM was registered through the public DSH `LlmAdapter` extension point. It made zero network model-provider calls but drove the real published Agent spine and AgentLoop.

Observed real round-trip evidence included:

```text
LLM requests: 2
tool executions: 1
pipeline: tools/pre-execute → tools/result
durable events include: turn/start → tool/call → tool/result → turn/end
network model calls: 0
```

The synthetic adapter replaces only the provider response. It does not replace the DSH AgentLoop, Session store, ToolRuntime, guard path, result path, or invariant services.

### Direct ToolRuntime boundary probe

Observed public DSH error behavior:

```text
malformed input
INVALID_ARGS / ToolArgsError
body calls: 0

malformed output
INVALID_TOOL_OUTPUT / ToolOutputError
body calls: 1

pre-execute allow followed by binding guard deny
final result: denied/error
body calls: 0
```

### Five-profile differential matrix

The matrix deliberately paired the DSH runtime candidate with ActionSeam's `PermissiveActionTarget`, so the ActionTarget could not provide a validating safety net. The known-bad runtime control used the same target.

```text
DeepSeekHarnessRuntime → PermissiveActionTarget
PASS 5
FAIL 0
report digest: sha256:137b921d4fbb117e445e5ae2048f3406f4a80449a7a9dd5849acaf7367cffcc9

KnownBadRuntime → PermissiveActionTarget
PASS 0
FAIL 5
report digest: sha256:94a8e301ba802279e7c23dc69096862e908165ceb4bd0cf84cba841f163942fa
```

Profiles in this evidence set:

- `authority.monotonic-deny.v1`;
- `contracts.input-validation.v1`;
- `contracts.output-validation.v1`;
- `authority.untrusted-context.v1`;
- `reconstruction.model-visible.v1`.

### Attribution boundary

- **Monotonic deny:** ActionSeam deliberately attempts an `allow` at the public `tools/pre-execute` seam; DSH's `ctx.tools.guard()` remains the binding veto and the tool body does not execute.
- **Input validation:** real DSH ToolRuntime rejects malformed arguments with `INVALID_ARGS` before body execution.
- **Output validation:** the permissive ActionTarget commits and returns malformed output; real DSH ToolRuntime rejects that completed body output with `INVALID_TOOL_OUTPUT`.
- **Untrusted context:** ActionSeam model-visible retrieved content drives an adversarial allow attempt; DSH's binding guard still denies with no committed effect. The adversarial attempt is ActionSeam-owned; the final veto is DSH-owned.
- **Model-visible reconstruction:** ActionSeam structurally verifies the exact material inputs/tool in the request received by the public LLM adapter while the published Agent spine runs DSH's package-owned AgentLoop invariant, which reconstructs request material from durable Session state and fails on divergence.

The remaining six ActionSeam profiles are not part of this DeepSeek Harness V0 claim: approval binding, external principal, idempotent retry, stale revision, tenant boundary, and secret canary.

This evidence also does not cover a real network model provider, ACP/MCP/HTTP/CLI/browser transport differential, production identity/tenant semantics, production filesystem/shell/sandbox behavior, distributed effect semantics, or framework-wide production safety.

The evidence pin names the last code-changing matrix head (`d171021639dce45532d624e42c41d5683e674ccb`). Documentation/provenance commits after that head must re-run CI but do not change which runtime code produced the pinned report digests.
