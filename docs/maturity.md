# Maturity

**Project maturity: EXPERIMENTAL / community preview.**

## Reference lab

| Area | State |
| --- | --- |
| clean-room reference runtime | experimental, executable |
| clean-room reference action target | experimental, executable |
| synthetic state/faults | experimental, executable |
| 11 initial profiles | experimental, executable |
| typed result vocabulary | experimental, executable |
| report digest | experimental, executable |
| counterexample output | experimental, executable |
| static Inspector | experimental, executable |

## External adapters

| Target | State |
| --- | --- |
| DeepSeek Harness | `PARTIAL` — real `0.1.0-rc.7` published Agent spine + AgentLoop evidence for 5 profiles with a deterministic public ActionSeam LLM adapter; remaining profiles/transports not claimed |
| Invokta | `PARTIAL` — real `@invokta/core@0.6.0` direct `engine.invoke` evidence; CLI/MCP/HTTP not tested |

No adapter should move to `PARTIAL` or `SUPPORTED` without executable evidence committed to this repository. A `PARTIAL` state must remain scoped to exact versions, configurations, transports/modes, profiles, and attribution boundaries.

## Launch state

The source repository entered **experimental community preview** on 19 August 2026 after the initial launch gate was satisfied:

- the clean-room reference lab is executable and reproducible;
- at least one real external adapter has meaningful executable evidence;
- the public quickstart is exercised by CI-compatible commands;
- security, provenance, governance, contribution, and support boundaries are documented;
- adapter claims remain scoped to exact versions, transports, profiles, and evidence.

Community preview means maintainers may actively invite reproduction, profile proposals, adapter work, and evidence review. It does **not** mean production readiness, framework-wide safety certification, stable API guarantees, or blanket compatibility with an upstream project.

## Publication boundary

Community preview is a **source-repository launch only**. The root package remains `private: true`; no npm/package publication, stable release, or package-support promise is created by this launch state.

Publishing a package or changing the release contract requires a separate ADR and release gate.
