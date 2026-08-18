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
