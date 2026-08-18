# Principles

## Evidence before confidence

A conformance statement must point to executable evidence from the exact subject/profile configuration being discussed.

## Exact versions before reputation

ActionSeam reports behavior for versions and profiles, not for a project's reputation. “Framework X passed” is too broad; “X@version passed profile Y with evidence Z” is the useful unit.

## Unsupported is a real result

If the adapter cannot observe or control a property required by a profile, the result must not be upgraded into a pass. `UNSUPPORTED` and `INDETERMINATE` exist specifically to preserve claim truth.

## Counterexample before score

A maintainer should be able to reproduce the smallest useful failing case. Aggregate scores may be added later, but they do not replace an actionable counterexample.

## Synthetic effects by default

The reference lab mutates only synthetic state. Real credentials, customer state, and real external side effects are outside the default conformance environment.

## Authority is not model text

Model-visible content may propose or influence work. It is not, by itself, deterministic proof of authorization.

## Operator legibility

Material state — proposal, approval, deny, retry, recovery, external effect, failure — should be understandable without interpreting a raw event dump. The Inspector is a reading surface, not an authority layer.

## Scope is a feature

A narrow, reproducible invariant is more valuable than a broad “AI safety” claim that cannot be falsified.
