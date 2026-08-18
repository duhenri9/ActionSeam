# Maturity

**Project maturity: EXPERIMENTAL / pre-launch.**

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
| DeepSeek Harness | `NOT_IMPLEMENTED` — provenance reviewed only |
| Invokta | `PARTIAL` — real `@invokta/core@0.6.0` direct `engine.invoke` evidence; CLI/MCP/HTTP not tested |

No adapter should move to `PARTIAL` or `SUPPORTED` without executable evidence committed to this repository.

## Launch state

Repository visibility is not the same as community launch. Active promotion should wait until at least one external adapter has meaningful executable evidence and the public quickstart/CI/security/provenance gates are stable.
