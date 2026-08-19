# Validation record

## 2026-08-19 — clean-room V0 pre-PR validation

Environment:

- Node.js `v22.16.0`;
- no third-party runtime or development dependencies;
- local clean-room directory created independently for ActionSeam.

Commands:

```bash
node --test
node src/cli.js demo --subject reference --out artifacts/reference
node src/cli.js demo --subject known-bad --out artifacts/known-bad
```

Observed:

```text
node --test
7 tests passed
0 failed

reference subject
PASS 11
FAIL 0

known-bad subject
PASS 0
FAIL 11
```

Reference report digest:

`sha256:38214cbd2c87ce1d46848817126903eb3b97cae50a475f9ca1cc2df8f0874ac6`

Known-bad report digest:

`sha256:166376aecc344a7d9a356fd5a9bfbcc9cdcbf2e0960fe15caafc2bd6b3076e7d`

These results cover only the clean-room reference subjects. They are not evidence for DeepSeek Harness, Invokta, or any production system.

## 2026-08-19 — Invokta 0.6.0 direct ActionTarget verification

GitHub Actions run `32198408794` tested ActionSeam head `54c1ccd66c1263ec39a1c128bcbb83b331fadb1d`, installed `@invokta/core@0.6.0` and `zod@4.4.3`, ran four adapter verification tests, and generated the current matrix reports.

Observed:

```text
adapter verification
4 tests passed
0 failed

ReferenceRuntime → InvoktaActionTarget@0.6.0
PASS 11
FAIL 0

KnownBadRuntime → InvoktaActionTarget@0.6.0
PASS 4
FAIL 7
```

Reference-runtime report digest:

`sha256:f5189883ecca3ff46515ecb7f3db55ea0b3715dabd6c0731196ec25f8a4f901a`

Known-bad-runtime report digest:

`sha256:03aa37c5a235685d2227b0b12fdd357a99dc242bef3e37e948ceecc83fb5c65b`

Workflow artifact:

- artifact id: `9346637326`;
- artifact digest: `sha256:ba6ad7f1b541af4299781f91643ca7db3b3f7176f9a7f2d40a039aa5d3b2fa82`.

### Attribution boundary

The `11 PASS / 0 FAIL` reference row is an end-to-end composition result, not eleven native Invokta guarantees.

Directly exercised Invokta enforcement in this adapter:

- input schema validation;
- output schema validation;
- capability `access` enforcement used by the tenant-boundary scenario.

The Invokta API also keeps `Principal` separate from business input, but ActionSeam's runtime remains responsible for deciding which principal is trusted.

ActionSeam-owned semantics in the same matrix include:

- stale-revision detection in the synthetic state provider, with adapter error normalization;
- effect-id reuse and provider deduplication for retry/idempotency;
- approval binding, monotonic deny, untrusted-context authority, model-visible reconstruction, and secret-canary handling in the runtime.

This evidence covers only the direct `engine.invoke` ActionTarget adapter. It is not evidence for Invokta CLI, MCP stdio, MCP HTTP, transport differential, a production identity provider, distributed provider semantics, or a production deployment.

The evidence pin intentionally names the last code-changing adapter head (`54c1ccd66c1263ec39a1c128bcbb83b331fadb1d`). Later documentation-only commits may re-run CI, but they do not retroactively change which adapter code produced the pinned report digests above.
