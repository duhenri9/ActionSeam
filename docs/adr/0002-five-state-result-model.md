# ADR 0002 — Five-state invariant result model

**Status:** accepted  
**Date:** 2026-08-19

## Decision

Each invariant reports one of:

`PASS | FAIL | UNSUPPORTED | NOT_TESTED | INDETERMINATE`.

## Rationale

Binary pass/fail encourages false confidence when an adapter lacks a required control or observation. The extra states preserve the difference between “cannot test”, “did not test”, and “ran but cannot decide”.
