# Security policy

ActionSeam can surface behavior that looks security-sensitive, but not every conformance failure is a vulnerability.

## Report privately when

Please use GitHub's private vulnerability reporting for issues that could materially compromise ActionSeam itself, its CI/release process, generated artifacts, or secrets.

If a profile appears to reveal a vulnerability in an external runtime/action system, do **not** publish a detailed exploit-style counterexample before the upstream maintainer has had a reasonable opportunity to assess it.

## Credential hygiene

ActionSeam's reference and adapter evidence must remain reproducible without production credentials. Do not commit personal, WM3 Digital, GitHub, model-provider, cloud, package-registry, or customer credentials to this repository, fixtures, generated evidence, issues, pull requests, or CI logs.

Common local credential files are ignored by `.gitignore`. CI also runs `scripts/scan-public-history-secrets.js`, which inspects reachable Git blobs for high-signal credential signatures and credential-shaped paths without printing matched secret values.

The history scan is defense in depth, not a substitute for GitHub native Secret Scanning / Push Protection where available. A heuristic scanner cannot prove the absence of every possible secret format.

If a real credential is ever committed or printed publicly:

1. revoke or rotate the credential first;
2. treat the original value as compromised even if the file or commit is later removed;
3. preserve enough non-secret evidence to understand the exposure;
4. remediate reachable Git history when appropriate;
5. re-run the public-history scan and GitHub-native checks before considering the incident closed.

## Ordinary public issues

The following usually belong in normal issues:

- a profile produces the wrong result on the reference subject;
- an adapter incorrectly reports `UNSUPPORTED`;
- evidence is missing or mislabeled;
- the Inspector renders the wrong state;
- documentation disagrees with shipped behavior.

## Current scope

The reference lab uses synthetic state and does not require production credentials. It is not a sandbox for arbitrary malicious code and does not claim host isolation.