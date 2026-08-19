import { access, readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const canonicalDescription = 'Adversarial conformance testing for agent runtimes, action boundaries, transports, and committed effects.'
const required = [
  'README.md',
  'LICENSE',
  'SECURITY.md',
  'CONTRIBUTING.md',
  'CODE_OF_CONDUCT.md',
  'GOVERNANCE.md',
  'SUPPORT.md',
  'CHANGELOG.md',
  'THIRD_PARTY_NOTICES.md',
  'docs/README.md',
  'docs/architecture.md',
  'docs/scope-and-limits.md',
  'docs/result-model.md',
  'docs/profiles.md',
  'docs/evidence.md',
  'docs/counterexamples.md',
  'docs/adapters.md',
  'docs/threat-model.md',
  'docs/maturity.md',
  'docs/provenance.md',
  'docs/validation-record.md',
  'docs/transport-validation.md',
  'docs/release-readiness.md',
  'examples/README.md',
  'examples/run-reference-suite.mjs',
  'examples/run-known-bad-profile.mjs',
  'examples/inspect-report.mjs',
  'adapters/deepseek-harness/provenance.json',
  'adapters/invokta/provenance.json',
]

for (const path of required) await access(resolve(root, path))

const packageJson = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'))
if (packageJson.license !== 'Apache-2.0') throw new Error('package.json must declare Apache-2.0')
if (packageJson.private !== true) throw new Error('root package remains private until the publishing ADR and release gates exist')
if (packageJson.version !== '0.0.0-experimental') {
  throw new Error('root package must remain 0.0.0-experimental during source-level community preview')
}
if (packageJson.description !== canonicalDescription) {
  throw new Error('package.json description must remain aligned with the canonical public project description')
}

const rootReadme = await readFile(resolve(root, 'README.md'), 'utf8')
for (const requiredMarker of [
  canonicalDescription,
  'EXPERIMENTAL / community preview',
  'pre-tool-dispatch `session/cancel`',
  'docs/release-readiness.md',
  'examples/README.md',
  'private: true',
]) {
  if (!rootReadme.includes(requiredMarker)) throw new Error(`README.md is missing public-boundary marker: ${requiredMarker}`)
}

const releaseReadiness = await readFile(resolve(root, 'docs/release-readiness.md'), 'utf8')
for (const requiredMarker of [
  'NOT READY FOR PACKAGE PUBLICATION',
  'private: true',
  'dedicated ADR',
  'define and prove the public contract',
]) {
  if (!releaseReadiness.includes(requiredMarker)) {
    throw new Error(`release-readiness.md is missing release gate marker: ${requiredMarker}`)
  }
}

for (const path of ['adapters/deepseek-harness/provenance.json', 'adapters/invokta/provenance.json']) {
  const record = JSON.parse(await readFile(resolve(root, path), 'utf8'))
  if (!record.upstream || !record.observed || !record.license) throw new Error(`${path} is missing provenance fields`)
  const allowedStatuses = new Set(['NOT_IMPLEMENTED', 'PARTIAL', 'SUPPORTED'])
  if (!allowedStatuses.has(record.supportStatus)) throw new Error(`${path} has an invalid supportStatus`)
  if (record.supportStatus !== 'NOT_IMPLEMENTED' && !record.verifiedEvidence) {
    throw new Error(`${path} claims executable support without verifiedEvidence`)
  }
}

const publicSource = [
  await readFile(resolve(root, 'src/reference/runtime.js'), 'utf8'),
  await readFile(resolve(root, 'src/reference/action-target.js'), 'utf8'),
  await readFile(resolve(root, 'src/profiles/index.js'), 'utf8'),
].join('\n')

for (const forbidden of ['nex-work-hub', 'labs/nex-assurance-v0', 'Decision Ledger', 'Business Model Compiler']) {
  if (publicSource.includes(forbidden)) throw new Error(`Public clean-room source contains forbidden private-origin marker: ${forbidden}`)
}

console.log('ActionSeam repository validation: PASS')
