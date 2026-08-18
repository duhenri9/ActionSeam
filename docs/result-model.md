# Result model

Every invariant uses one of five states.

| State | Meaning |
| --- | --- |
| `PASS` | The evidence required by the profile was available and satisfied the invariant. |
| `FAIL` | Available evidence demonstrates an invariant violation. |
| `UNSUPPORTED` | The subject/adapter cannot provide a control or observation required to run the profile as defined. |
| `NOT_TESTED` | The profile was not run for this subject/configuration. |
| `INDETERMINATE` | The profile ran, but the evidence is insufficient or contradictory, so neither pass nor fail is justified. |

A result is scoped to:

- profile id/version;
- scenario id;
- runtime id/version;
- action-target id/version;
- transport/configuration when relevant;
- evidence produced in the run.

The current report schema is `actionseam.conformance-report/v0.1`.

## Report digest

The reporter hashes the deterministic report body with SHA-256. The digest detects accidental changes to subject metadata, result summaries, profile outcomes, and counterexamples in a generated report. It is not a cryptographic attestation of the test environment.
