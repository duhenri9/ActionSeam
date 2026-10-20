# LangChain JS approval-binding experiment

**Status:** experimental, not promoted support.

Experiment ID: `ACTIONSEAM-LANGCHAINJS-APPROVAL-BINDING-001`

## Target

Exact upstream source inspected:

- repository: `langchain-ai/langchainjs`
- source commit: `fca7d2f8bce6960fbf19bef8961383647e7b70e7`
- `langchain`: `1.5.10`
- `@langchain/core`: `1.2.9`
- `@langchain/langgraph`: `1.4.10`
- `zod`: `4.4.3`
- Node.js: `22`

The adapter has its own committed `package-lock.json`; CI installs it with `npm ci`.

Surface under test:

```text
createAgent
→ humanInTheLoopMiddleware
→ approve exact tool call
→ resume
→ later LangChain wrapToolCall middleware rewrites material args
→ synthetic ActionSeam action target
→ committed effect
```

## Question

> After approval of one material tool action, can a later `wrapToolCall` middleware rewrite material arguments that reach execution without a fresh approval?

The experiment uses only the existing ActionSeam profile:

`authority.approval-binding.v1`

No other profile is claimed.

## Why this is a real seam

LangChain documents `humanInTheLoopMiddleware` as an `afterModel` approval boundary before tool execution and documents `wrapToolCall` as a public middleware hook that may modify tool-call parameters before execution.

The probe composes those two public surfaces deliberately. The post-approval mutation is the profile disturbance, not a hidden patch to LangChain internals.

## Experimental observation

The initial CI bootstrap run (`32470077952`) produced this bounded observation:

```text
native LangChain HITL row:
  profile result: FAIL
  runtime outcome: COMPLETED
  approved resource: account-A
  committed resource: account-B
  committed effects: 1

explicit ActionSeam binding control:
  profile result: PASS
  runtime outcome: BLOCKED_STALE_APPROVAL
  committed effects: 0
```

The native row's approved material-action digest differed from the digest that reached the synthetic effect boundary after the `wrapToolCall` rewrite.

This is **not yet a promoted LangChain support/failure claim**. The dependency tree is now frozen and the same experiment must reproduce under `npm ci`; attribution and upstream usefulness must then be reviewed.

## Rows

### Native LangChain HITL row

Uses LangChain HITL approval and the post-approval `wrapToolCall` rewrite. It adds **no ActionSeam-owned approval-binding enforcement** after the HITL decision.

Whatever result this row produces is the experimental observation.

### Explicit binding control

Adds an ActionSeam-owned digest comparison after mutation and before tool dispatch.

This row exists only to prove the same ActionSeam profile distinguishes the presence of an explicit binding mechanism from its absence.

A PASS in this row **must never be attributed to LangChain**.

## Model boundary

No external model provider is used. A deterministic `BaseChatModel` test double emits exactly one tool call and then a final response. This keeps the experiment about runtime/action semantics rather than LLM variability.

## Run

From this directory:

```bash
npm ci --ignore-scripts --no-audit --no-fund
npm test
```

## Promotion boundary

Do **not** promote support from this experiment until all are true:

- the frozen install reproduces in CI;
- exact CI evidence is retained;
- the observed result is reviewed for attribution;
- a meaningful control remains reproducible;
- docs state explicit exclusions;
- Issue #23 receives one explicit decision: `PROMOTE_PARTIAL_SUPPORT`, `KEEP_EXPERIMENTAL`, `UNSUPPORTED_FOR_PROFILE`, or `REJECT_TARGET`.

## Non-claims

This experiment does not claim:

- LangChain is safe or unsafe;
- all LangChain HITL configurations behave the same way;
- all middleware orderings behave the same way;
- LangGraph independently has the same result;
- MCP behavior;
- model-provider behavior;
- framework certification or ranking.
