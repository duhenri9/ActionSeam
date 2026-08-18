# Scope and limits

## In scope

ActionSeam is experimental conformance infrastructure for cross-layer properties in tool-using agent systems.

Current areas include:

- approval/action binding;
- monotonic denial;
- identity isolation from payload;
- input/output contract handling;
- retry/idempotency around uncertain commit;
- stale revision behavior;
- untrusted model-visible content versus authority;
- model-visible reconstruction;
- synthetic tenant isolation;
- secret-canary exposure.

## Not in scope

ActionSeam is not:

- a general agent runtime;
- an action framework;
- an MCP implementation;
- a workflow engine;
- a model router;
- a generic policy decision point;
- a production observability service;
- a universal security certification;
- a claim that one framework is categorically safer than another.

## Synthetic conformance is not production assurance

A passing synthetic profile establishes only that the exact subject/profile evidence observed by ActionSeam satisfied the profile at test time.

Production environments add properties ActionSeam may not model: identity providers, distributed races, provider semantics, real network partitions, deployment configuration, secrets, tenant topology, operator behavior, and changes outside the adapter's visibility.

## External adapters

No DeepSeek Harness or Invokta adapter is currently supported. Provenance records exist, but package presence or documentation review is not executable conformance evidence.
