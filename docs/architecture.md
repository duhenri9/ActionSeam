# Architecture

ActionSeam separates the subject under test from the scenario, external synthetic state, evidence, and validators.

```text
Versioned Profile
      │
      ├── synthetic scenario
      ├── disturbance/fault
      └── invariant
      │
      ▼
Runtime subject
      │
      ▼
Action target
      │
      ▼
SyntheticStateStore
      │
      ├── attempts
      ├── committed effects
      └── pre/post resource state
      │
      ▼
Evidence + validator
      │
      ▼
Conformance report
      ├── explicit status
      ├── evidence references
      └── counterexample when failed
```

## Current clean-room reference pieces

### Runtime subject

`ReferenceRuntime` models a runtime that:

- establishes trusted identity outside business input;
- records model-visible inputs/tool state before request;
- keeps deny monotonic;
- binds approval to an action digest;
- reuses an effect id after an uncertain commit.

`KnownBadRuntime` is intentionally vulnerable test equipment. It exists to prove the profiles can fail; it is not intended to model a particular external framework.

### Action target

`ReferenceActionTarget` validates action input, checks tenant/principal consistency, preserves expected revisions, and validates the provider result before calling it successful.

`PermissiveActionTarget` intentionally violates those boundaries to test the validators.

### Synthetic external state

`SyntheticStateStore` owns independently inspectable state. It supports deterministic faults including:

- response loss after commit;
- malformed result after commit;
- stale expected revision.

The state store is not an external provider emulator for a specific vendor. It is deterministic test infrastructure.

## Framework-neutral boundary

The current reference classes are test subjects, not ActionSeam's universal runtime/action APIs. External adapters will normalize upstream systems into the evidence and execution surfaces required by each profile.

An adapter must publish capability/limitation metadata so profile applicability is explicit.
