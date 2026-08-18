# Adapter model

ActionSeam intends to support two external adapter roles.

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

DeepSeek Harness and Invokta have provenance records under `adapters/`, but executable adapters have not landed yet. Their status is therefore **NOT IMPLEMENTED**, not partial support.
