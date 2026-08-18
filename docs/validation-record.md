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

GitHub Actions run `32197878625` installed `@invokta/core@0.6.0` and `zod@4.4.3`, generated a lockfile, ran adapter verification, and generated two matrix reports.

Observed:

```text
ReferenceRuntime → InvoktaActionTarget@0.6.0
PASS 11
FAIL 0

KnownBadRuntime → InvoktaActionTarget@0.6.0
PASS 4
FAIL 7
```

Reference-runtime report digest:

`sha256:409af23d272937ee2c11e4ab9d7738d14b5d26860d876f78b0fe1f0d41c3a6f0`

Known-bad-runtime report digest:

`sha256:b67834b7f7bc87e24ff19b4fbb84cf1caec4e9a31a6e8f53661131e6562c3521`

Workflow artifact digest:

`sha256:2911a36f6dec42eb419e525b2fb0c520349ed910aa60eb19ac797c2733f12849`

This evidence covers only the direct `engine.invoke` ActionTarget adapter. It is not evidence for Invokta CLI, MCP stdio, MCP HTTP, transport differential, or a production deployment.
