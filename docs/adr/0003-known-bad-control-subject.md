# ADR 0003 — Reference subjects include a deliberately failing control

**Status:** accepted  
**Date:** 2026-08-19

## Decision

Every shipped reference profile must be exercised against both:

1. a reference subject expected to preserve the property; and
2. a deliberately vulnerable control subject expected to violate it.

## Rationale

A conformance suite that only demonstrates green output has not shown that its validators are sensitive to the behavior they claim to measure.

The known-bad subject is test equipment and must never be presented as a model of a named external project.
