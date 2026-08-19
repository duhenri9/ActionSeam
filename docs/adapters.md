# Adapter model

ActionSeam supports two external adapter roles.

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
- publish the synthetic action through a supported transport;
- preserve independently established identity when applicable;
- expose validation/access/result evidence available from the target;
- route effects only to ActionSeam synthetic state/provider infrastructure.

## Current external targets

| Target | Role | Evidence-backed state |
| --- | --- | --- |
| DeepSeek Harness `0.1.0-rc.7` | runtime | `PARTIAL` — published Agent spine + AgentLoop, deterministic public ActionSeam LLM adapter, 5 DSH-sensitive profiles |
| Invokta `@invokta/core@0.6.0` | action target | `PARTIAL` — direct `engine.invoke` evidence |

`PARTIAL` is deliberately narrow. It does not mean every ActionSeam profile applies to the target, every upstream transport has been tested, or the upstream project is production-safe.

DeepSeek Harness V0 currently claims only `authority.monotonic-deny.v1`, `contracts.input-validation.v1`, `contracts.output-validation.v1`, `authority.untrusted-context.v1`, and `reconstruction.model-visible.v1` for the exact direct Agent-spine composition documented under `adapters/deepseek-harness/`.

Invokta V0 is limited to its documented direct `engine.invoke` ActionTarget boundary. See each adapter README and provenance record for exact versions, evidence, attribution, and exclusions.
