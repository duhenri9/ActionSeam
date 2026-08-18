# Security policy

ActionSeam can surface behavior that looks security-sensitive, but not every conformance failure is a vulnerability.

## Report privately when

Please use GitHub's private vulnerability reporting for issues that could materially compromise ActionSeam itself, its CI/release process, generated artifacts, or secrets.

If a profile appears to reveal a vulnerability in an external runtime/action system, do **not** publish a detailed exploit-style counterexample before the upstream maintainer has had a reasonable opportunity to assess it.

## Ordinary public issues

The following usually belong in normal issues:

- a profile produces the wrong result on the reference subject;
- an adapter incorrectly reports `UNSUPPORTED`;
- evidence is missing or mislabeled;
- the Inspector renders the wrong state;
- documentation disagrees with shipped behavior.

## Current scope

The reference lab uses synthetic state and does not require production credentials. It is not a sandbox for arbitrary malicious code and does not claim host isolation.
