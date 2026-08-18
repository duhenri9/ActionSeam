# Evidence

Evidence is the material a profile validator is allowed to use when deciding a result.

The reference runtime emits ordered records such as:

- model input admitted;
- model-facing tool descriptor admitted;
- model request manifest digest;
- independently established principal;
- proposed action digest;
- policy decision;
- approval binding;
- injected disturbance;
- action attempts and effect ids;
- terminal outcome.

The synthetic state store independently exposes:

- resource state;
- effect records;
- provider attempts.

## Evidence discipline

A validator should use the smallest evidence set that proves its property. More telemetry is not automatically stronger evidence.

External adapters may expose less evidence than the reference subject. When a required fact is not observable, ActionSeam should report `UNSUPPORTED` or `INDETERMINATE`, depending on whether the limitation is known before execution or discovered during it.

## Reconstruction

The reconstruction profile compares the digest of the request manifest to a digest rebuilt from durable model-visible inputs and tool state. It does not claim to reconstruct hidden model reasoning.
