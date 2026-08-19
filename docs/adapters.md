# Adapter model

ActionSeam supports two external adapter roles and evaluates transport behavior as a separate evidence dimension.

## Runtime adapter

A runtime adapter identifies an exact runtime version/configuration and provides the controls/evidence required by applicable profiles.

Typical responsibilities:

- start/connect to the runtime;
- submit bounded synthetic work;
- expose model-visible/session/tool evidence when public surfaces support it;
- connect the runtime to an ActionSeam-compatible synthetic action target;
- inject or coordinate supported disturbances;
- declare unsupported surfaces explicitly.

## Action-target adapter

An action-target adapter exposes one synthetic semantic action behind an external action system without turning that system's native types into ActionSeam core contracts.

Typical responsibilities:

- identify the exact target/version;
- publish the synthetic action using a supported transport;
- preserve independently established identity when applicable;
- expose validation/access/result evidence available from the target;
- route effects only to ActionSeam synthetic state/provider infrastructure.

## Transport differential

A transport differential compares the same bounded semantic operation across two concrete paths and asks whether material input, tool invocation, committed effect, terminal output, and protocol-specific evidence are preserved.

Transport evidence does not automatically inherit runtime-profile evidence. A runtime may have seven verified profiles while only narrow scenarios or methods are verified over a given transport.

A promoted transport differential should:

- identify exact upstream package/protocol versions;
- cross the real transport boundary rather than an in-memory substitute when the claim is about process/network transport;
- compare the same synthetic semantic fixture with a direct or previously trusted baseline;
- normalize only volatile transport details;
- include a negative control that demonstrates the comparator detects a meaningful divergence;
- declare adjacent protocol methods/sub-surfaces as unclaimed unless separately exercised.

## Current external targets

| Target | Role | Evidence-backed state |
| --- | --- | --- |
| DeepSeek Harness `0.1.0-rc.7` | runtime | `PARTIAL` — published Agent/ToolRuntime composition with 7 attributable profiles, including public one-shot approval and immutable-argument enforcement |
| DeepSeek Harness `@deepseek-ai/dsh-acp@0.1.0-rc.7` | transport | `PARTIAL` — real child-process ACP JSON-RPC stdio baseline + one-shot `session/request_permission` allow/reject + pre-tool-dispatch `session/cancel` |
| Invokta `@invokta/core@0.6.0` | action target | `PARTIAL` — direct `engine.invoke` evidence over its explicitly homologated 11-profile scope |

`PARTIAL` is deliberately narrow. It does not mean every ActionSeam profile applies to the target, every upstream transport or transport method has been tested, or the upstream project is production-safe.

DeepSeek Harness currently claims these seven runtime profiles for the exact public compositions documented under `adapters/deepseek-harness/`:

- `authority.approval-one-shot.v1`;
- `authority.monotonic-deny.v1`;
- `contracts.input-validation.v1`;
- `contracts.argument-immutability.v1`;
- `contracts.output-validation.v1`;
- `authority.untrusted-context.v1`;
- `reconstruction.model-visible.v1`.

The original `authority.approval-binding.v1` remains unclaimed: DSH prevents argument rewrite before dispatch, but the current ActionSeam profile specifically requires a material post-approval mutation to occur and then invalidate the old approval. ActionSeam does not redefine that profile just to manufacture compatibility.

The separate ACP transport claim currently proves three independently gated slices over real child-process stdio JSON-RPC using the official ACP SDK:

1. one deterministic text/tool/effect/final-answer baseline;
2. one-shot `session/request_permission` mapping for both allow and reject decisions, including exact session/tool-call identity and effect/no-effect outcomes;
3. pre-tool-dispatch `session/cancel`, where the model request is confirmed in flight before cancellation, the DSH model `AbortSignal` is observed, the exact active ACP session is targeted, the original prompt settles `cancelled`, and zero tool-body executions / synthetic effects occur.

These slices do not say the seven runtime profiles were executed over ACP. The cancellation slice is also deliberately bounded: it does not establish rollback after a tool body starts, rollback of a committed effect, or cancellation of a non-cooperative running tool.

Invokta remains limited to the eleven profiles it previously homologated. The two later generic profiles do not become Invokta claims merely because they exist in the global catalog.

ACP cancelled-permission equivalence, rollback after tool/effect execution begins, cancellation of a non-cooperative running tool, multi-session isolation, images, MCP integration, HTTP, Web/GUI RPC, and broader CLI/package differentials remain distinct future gates. See each adapter README and provenance record for exact versions, evidence, attribution, and exclusions.
