# Counterexamples

A failed profile should answer: **what is the smallest reproducible observation that demonstrates the invariant did not hold?**

The experimental counterexample contains:

- scenario id;
- expected property;
- observed divergence;
- a bounded slice of evidence near the failure;
- a reproduction command.

Example command:

```bash
node src/cli.js run authority.approval-binding.v1 --subject known-bad
```

The `known-bad` subject is deliberate test equipment. A public counterexample against an external project must use the exact upstream version/configuration and may require responsible disclosure before publication if it appears security-sensitive.

Counterexample minimization is currently manual/profile-specific. Generic minimization is future work.
