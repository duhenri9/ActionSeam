# ADR 0001 — Clean-room repository origin

**Status:** accepted  
**Date:** 2026-08-19

## Context

ActionSeam is intended to be independently understandable, implementable, and auditable as open-source conformance infrastructure.

## Decision

The public repository starts from fresh Git history and original public code. Private codebases are not used as parent repositories, source trees, fixture seeds, or mechanical rewrite inputs.

## Consequences

- provenance can be explained from public history;
- public abstractions must justify themselves without private implementation knowledge;
- duplicate engineering effort is accepted when necessary to preserve the boundary.
