# Maturity

**Project maturity: EXPERIMENTAL / community preview.**

## Reference lab

| Area | State |
| --- | --- |
| clean-room reference runtime | experimental, executable |
| clean-room reference action target | experimental, executable |
| synthetic state/faults | experimental, executable |
| 13 shipped profiles | experimental, executable |
| typed result vocabulary | experimental, executable |
| report digest | experimental, executable |
| counterexample output | experimental, executable |
| static Inspector | experimental, executable |

## External adapters

| Target | State |
| --- | --- |
| DeepSeek Harness runtime profiles | `PARTIAL` — real `0.1.0-rc.7` public Agent/ToolRuntime composition with executable evidence for 7 profiles; includes real one-shot approval and immutable-argument mechanisms; six profiles remain unclaimed |
| DeepSeek Harness ACP stdio transport | `PARTIAL` — one exact direct-vs-real-child-process JSON-RPC stdio differential preserves input/tool/effect/final-answer semantics; permission, cancellation, multi-session, images, MCP/HTTP/Web and all-seven-profiles-over-ACP remain unclaimed |
| Invokta | `PARTIAL` — real `@invokta/core@0.6.0` direct `engine.invoke` evidence over its explicitly homologated 11-profile scope; the two later profiles are not inherited automatically; CLI/MCP/HTTP not tested |

Runtime-profile and transport evidence are separate dimensions. A transport PASS does not imply every runtime profile has been exercised over that transport, and a runtime-profile PASS does not imply transport equivalence.

No adapter should move to `PARTIAL` or `SUPPORTED` without executable evidence committed to this repository. A `PARTIAL` state must remain scoped to exact versions, configurations, transports/modes, profiles, and attribution boundaries.

A profile being added to the ActionSeam catalog does **not** expand any external adapter's claim automatically. Each target must separately show a public, observable, attributable mechanism and executable differential evidence for that profile.

Likewise, adding one verified transport does not make adjacent upstream protocols equivalent. ACP stdio, MCP integration, HTTP, Web/GUI RPC, and CLI packaging remain distinct until separately tested.

## Launch state

The source repository entered **experimental community preview** on 19 August 2026 after the initial launch gate was satisfied:

- the clean-room reference lab is executable and reproducible;
- at least one real external adapter has meaningful executable evidence;
- the public quickstart is exercised by CI-compatible commands;
- security, provenance, governance, contribution, and support boundaries are documented;
- adapter claims remain scoped to exact versions, transports, profiles, and evidence.

Community preview means maintainers may actively invite reproduction, profile proposals, adapter work, transport differentials, and evidence review. It does **not** mean production readiness, framework-wide safety certification, stable API guarantees, or blanket compatibility with an upstream project.

## Publication boundary

Community preview is a **source-repository launch only**. The root package remains `private: true`; no npm/package publication, stable release, or package-support promise is created by this launch state.

Publishing a package or changing the release contract requires a separate ADR and release gate.
