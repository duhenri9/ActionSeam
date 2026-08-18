# Invokta action-target adapter

**Status: verification candidate — not yet promoted beyond `NOT_IMPLEMENTED` until this branch's CI evidence is reviewed.**

This adapter targets the public `@invokta/core@0.6.0` package over its direct `engine.invoke` path.

## Boundary

ActionSeam owns the synthetic scenario, trusted ActionSeam principal, effect id, synthetic external state, fault injection, invariant evaluator, report, and counterexample.

The adapter maps those inputs into a real Invokta Action Engine that owns:

- capability input validation;
- a capability `access` check using Invokta's separately supplied `Principal`;
- capability execution;
- output validation;
- public Invokta invocation events.

Invokta-native types remain inside this directory. The ActionSeam core does not depend on `@invokta/core`.

## Exact upstream

- package: `@invokta/core@0.6.0`;
- source/docs snapshot reviewed: `10648f80a1df9cbe21e99eb3119772f3ad824b12`;
- license: MIT;
- transport in this adapter: `direct` only.

## What this does not test yet

- Invokta CLI;
- MCP stdio;
- MCP HTTP;
- transport differential;
- production identity-provider integration;
- distributed provider semantics.

Package installation or a green import is not sufficient for support. The adapter status will only be updated after executable CI evidence from the real package is inspected.
