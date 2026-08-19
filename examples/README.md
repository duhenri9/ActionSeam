# ActionSeam examples

These examples are deliberately small and source-level. They show how to reproduce ActionSeam's current experimental behavior without implying a published package, stable API, hosted service, or production integration.

Requirements: Node.js 22+.

## 1. Run the clean-room reference suite

```bash
node examples/run-reference-suite.mjs
```

The example imports the current source modules, runs all shipped profiles against the clean-room reference subject, builds the deterministic report model, and fails if the reference no longer passes every shipped profile.

Expected shape:

```text
profiles: 13
PASS: 13
FAIL: 0
reportDigest: sha256:...
```

The digest is content-derived. Do not copy a digest from documentation and treat it as proof for a different checkout.

## 2. See a real counterexample from the deliberately vulnerable subject

```bash
node examples/run-known-bad-profile.mjs
```

This runs `authority.approval-binding.v1` against ActionSeam's own known-bad test subject and asserts that the validator returns `FAIL` with a counterexample.

The known-bad subject is test equipment. It is not a reproduction, score, or security assessment of DeepSeek Harness, Invokta, or another external project.

## 3. Author and execute a local profile

```bash
node examples/run-local-profile.mjs
```

This example defines a small profile object outside the shipped catalog, executes it against the reference subject, and asserts the expected committed effect.

The example shows the current source-level profile shape:

```text
id + title + expectation
scenario
  trustedPrincipal
  action
  policy
  context
evaluate({ profile, scenario, run, snapshot })
  -> PASS | FAIL | ...
```

A local example profile does **not** become a shipped ActionSeam profile merely because it runs. Promotion into the versioned catalog still requires the profile design, evidence model, counterexample behavior, documentation, and review expected by [`../docs/profiles.md`](../docs/profiles.md).

## 4. Bring a runtime to one bounded profile

```bash
node examples/bring-your-runtime.mjs
```

This is the smallest current runtime-adapter template. It wires one shipped profile to a source-level runtime seam and runs the same scenario twice:

- candidate: approval-binding mechanism present before dispatch → `PASS`, zero committed effects;
- negative control: the binding check is deliberately removed → `FAIL`, one committed effect and a counterexample.

The example is intentionally not an external framework claim. Replace its `execute(...)` seam with the exact public runtime boundary you want to test, pin that subject/version, preserve the negative control, and only promote support after evidence and attribution are complete.

See [`../docs/bring-your-runtime.md`](../docs/bring-your-runtime.md) for the promotion checklist.

## 5. Generate and inspect report artifacts

```bash
node src/cli.js demo --subject reference --out artifacts/reference
node src/cli.js demo --subject known-bad --out artifacts/known-bad
```

Each output directory contains:

```text
report.json
inspector.html
```

Open the HTML file locally for an operator-readable view, or inspect the report from the command line:

```bash
node examples/inspect-report.mjs artifacts/reference/report.json
node examples/inspect-report.mjs artifacts/known-bad/report.json
```

The inspection example checks the report schema and digest shape before printing the summary and any failing counterexamples.

## 6. Inspect adapter provenance before reading a support claim

```bash
node examples/inspect-adapter-provenance.mjs
node examples/inspect-adapter-provenance.mjs adapters/invokta/provenance.json
```

The example reads an adapter provenance record and surfaces:

- exact upstream/package version;
- observed upstream commit;
- `PARTIAL` / `SUPPORTED` state;
- explicitly supported profiles;
- verified transport slices, when present.

This is the intended reading order for external integration claims: **provenance and evidence first, headline support status second**.

## 7. Run one shipped profile with the experimental CLI

Reference subject:

```bash
node src/cli.js run authority.approval-binding.v1 --subject reference
```

Known-bad subject:

```bash
node src/cli.js run authority.approval-binding.v1 --subject known-bad
```

The known-bad command intentionally exits non-zero because the profile returns `FAIL`. In shell automation, treat that non-zero exit as expected test behavior only when the specific scenario is deliberately known-bad.

## 8. Reproduce external adapter evidence

External adapter work is isolated under `adapters/` and carries its own dependency freeze and scope boundary.

- DeepSeek Harness runtime evidence: [`../adapters/deepseek-harness/README.md`](../adapters/deepseek-harness/README.md)
- DeepSeek Harness ACP transport evidence: [`../adapters/deepseek-harness/acp-transport/README.md`](../adapters/deepseek-harness/acp-transport/README.md)
- Invokta action-target evidence: [`../adapters/invokta/README.md`](../adapters/invokta/README.md)

Follow those adapter-local reproduction commands instead of installing their dependencies into the repository root.

## Result vocabulary

Every profile result is one of:

```text
PASS
FAIL
UNSUPPORTED
NOT_TESTED
INDETERMINATE
```

`PASS` means the exact tested subject/configuration satisfied that profile using the evidence the validator accepts. It is not a blanket framework certification.

`UNSUPPORTED` means the subject does not expose the capability required by that profile. It is not a weak pass.

`NOT_TESTED` means the profile was not executed for that subject/configuration.

`INDETERMINATE` means the available evidence cannot justify either pass or fail.

See [`../docs/result-model.md`](../docs/result-model.md) for the normative semantics.

## Adding an example

An example should:

1. use public ActionSeam source contracts only;
2. be deterministic or clearly identify its external dependencies;
3. avoid credentials and live customer/provider data;
4. fail loudly when its stated invariant is broken;
5. avoid implying package/API stability that does not exist yet;
6. be added to CI when it represents a supported onboarding path.

Examples explain the project. They do not redefine profile semantics, adapter ownership, maturity, or support claims.
