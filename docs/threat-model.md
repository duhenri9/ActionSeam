# Threat model

ActionSeam is an experimental conformance lab, not a security boundary for arbitrary untrusted code.

## Assets protected by the reference lab

The initial lab is designed to protect only synthetic test integrity:

- trusted synthetic principal versus payload identity;
- synthetic tenant separation;
- synthetic external state;
- private synthetic canaries;
- evidence/result semantics.

## Adversarial inputs modeled

- material action mutation after approval;
- conflicting authority decisions;
- identity-like payload fields;
- response loss after commit;
- malformed input/output;
- stale revisions;
- model-visible retrieved text attempting to influence authority;
- incomplete durable reconstruction;
- cross-tenant targets;
- private canary exposure.

## Out of scope for the current runtime

- sandboxing arbitrary malicious code;
- host compromise;
- supply-chain compromise of Node/GitHub Actions;
- real provider/account security;
- production IAM correctness;
- model provider confidentiality guarantees;
- denial of service;
- exhaustive prompt-injection resistance;
- cryptographic attestation of the machine running the test.

External-adapter security findings should be handled according to [`../SECURITY.md`](../SECURITY.md).
