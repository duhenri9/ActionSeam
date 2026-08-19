# Release and package readiness

**Current state: NOT READY FOR PACKAGE PUBLICATION.**

ActionSeam is an experimental source-repository community preview. The root package intentionally remains:

```json
{
  "version": "0.0.0-experimental",
  "private": true
}
```

This is a product boundary, not missing polish. The repository may become easier to discover, reproduce, and contribute to while the package remains unpublished and the public API remains unstable.

## Release principle

ActionSeam must not remove `private: true`, publish to npm, or advertise a stable package merely to look mature.

A release becomes justified only when a maintainer can answer all of these questions with executable or documented evidence:

- What exact API or CLI contract are users meant to depend on?
- Which parts are stable, experimental, internal, or adapter-specific?
- How are compatibility and breaking changes versioned?
- Can the published artifact be reproduced and inspected?
- Does the documentation describe the installed artifact rather than only the source tree?
- Can maintainers support the release lifecycle without weakening ActionSeam's claim discipline?

## Gate 1 — public contract

Before package publication:

- define intentional public entry points rather than relying on arbitrary source paths;
- define whether the supported surface is a JavaScript API, CLI, profile schema, adapter SDK, or a smaller combination;
- separate public contracts from internal reference-lab implementation details;
- document input/output schemas and error/result semantics for each supported entry point;
- specify which contracts are stable and which remain experimental;
- add contract tests that fail on accidental breaking changes.

The current source imports used by examples are educational and experimental. They are not yet a stable package API.

## Gate 2 — package boundaries and install contract

Before removing `private: true`:

- choose and verify the final package name and ownership namespace;
- define package exports explicitly;
- define the minimum supported Node.js version and module format;
- decide whether adapters remain isolated packages/examples or become separately versioned packages;
- verify a clean install in an empty project using the exact artifact intended for publication;
- ensure runtime dependencies are minimal, intentional, and license-compatible;
- ensure development/probe-only dependencies cannot leak into the consumer install contract.

## Gate 3 — versioning and lifecycle policy

A first public package release needs:

- a SemVer policy;
- a documented meaning for `0.x` versus a future stable release;
- a deprecation policy;
- migration guidance for breaking changes;
- a compatibility statement for profile/report schemas;
- a policy for adapter support against exact upstream versions;
- a changelog generated from verified repository state rather than marketing claims.

## Gate 4 — release integrity and provenance

A release pipeline should produce inspectable evidence for the artifact being published:

- source commit SHA;
- package version;
- package contents manifest;
- dependency lock/provenance where applicable;
- checksums for generated artifacts;
- CI run identity;
- license and third-party notices;
- secret scan result for the release commit/history scope;
- provenance or signing/attestation when the chosen registry/workflow supports it reliably.

The pipeline must fail closed if artifact verification fails. A successful source CI run is not automatically evidence for a different generated package.

## Gate 5 — documentation and examples

Before publication, documentation must cover the installed-user path:

- installation;
- minimal runnable example;
- CLI/API reference for the supported surface;
- result semantics;
- profile authoring or extension model, if public;
- adapter compatibility boundaries;
- security disclosure process;
- support expectations;
- migration/deprecation policy;
- examples executed in CI where practical.

Source-tree examples alone are not sufficient evidence for package ergonomics.

## Gate 6 — security and operational hygiene

Release readiness requires:

- the permanent public-history credential scan to remain green;
- native GitHub security controls to be verified separately when available;
- no real credentials, private fixtures, customer data, or private WM3/Nex implementation in the release artifact;
- a defined security-reporting path;
- dependency and release-workflow permissions kept minimal;
- release credentials scoped to publication only and never written into repository content or artifacts.

## Gate 7 — legal and governance readiness

Before publication:

- Apache-2.0 remains correct for the intended artifact;
- third-party notices match shipped dependencies/content;
- clean-room provenance remains intact;
- contribution/governance rules cover public API changes;
- a maintainer has explicitly approved the package boundary and support promise.

## Required decision before publication

Removing `private: true` requires a dedicated ADR that records at least:

1. package name and supported entry points;
2. versioning policy;
3. compatibility and deprecation policy;
4. release pipeline and artifact-verification evidence;
5. support/maturity statement;
6. security and provenance controls;
7. rollback/unpublish or deprecation strategy if the release is defective.

Until that ADR exists and its executable gates are green, the repository validator should continue rejecting a non-private root package.

## What repository promotion may do now

The current community-preview phase **may** improve:

- GitHub metadata and discoverability;
- README onboarding;
- source-level examples;
- documentation navigation;
- repository security/protection settings;
- contribution ergonomics;
- executable evidence quality.

It **must not** use those improvements as justification for an npm release by themselves.

## Readiness status

| Area | Current status |
| --- | --- |
| source-level reference lab | ready for experimental community reproduction |
| result/profile documentation | available, still experimental |
| external adapter evidence | partial and exact-version scoped |
| ACP transport evidence | partial and sub-surface scoped |
| stable JavaScript package API | **not defined** |
| stable CLI contract | **not defined** |
| install-from-registry contract | **not tested** |
| SemVer/deprecation policy | **not adopted for a public package** |
| release artifact pipeline | **not implemented** |
| npm publication | **not approved** |

The correct next release milestone is not “publish”. It is **define and prove the public contract**.
