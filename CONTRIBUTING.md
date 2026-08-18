# Contributing to ActionSeam

ActionSeam values contributions that make a cross-layer property easier to test, reproduce, or understand.

## Useful contribution types

- runtime adapters;
- action-target adapters;
- new synthetic profiles/fixtures;
- validator improvements;
- smaller counterexamples;
- version-compatibility updates;
- Inspector/operator-legibility improvements;
- documentation and threat-model corrections.

## Before opening a change

1. Read [`docs/README.md`](./docs/README.md).
2. Confirm the change stays inside ActionSeam's conformance scope.
3. Use synthetic/public information only.
4. Add or update tests.
5. Run:

```bash
npm test
npm run validate
node src/cli.js demo --subject reference
node src/cli.js demo --subject known-bad
```

## Profile changes

A new profile should include:

- stable id/version;
- falsifiable invariant;
- synthetic scenario;
- disturbance/failure condition;
- required evidence;
- deterministic evaluator;
- expected reference result;
- expected known-bad failure/counterexample.

## Adapter changes

Record exact upstream package/version/commit, public surfaces used, license, limitations, and supported profiles. Do not claim support because a package installs or a CLI starts.

## Architecture changes

Open an ADR when a change materially alters public contracts, result semantics, evidence meaning, adapter roles, or project scope.

## Provenance

State when code is original, adapted, or vendored. Do not use private source material as implementation authority for this repository.
