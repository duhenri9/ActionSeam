import { access, readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
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
  'adapters/deepseek-harness/provenance.json',
  'adapters/invokta/provenance.json',
]

for (const path of required) await access(resolve(root, path))

const packageJson = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'))
if (packageJson.license !== 'Apache-2.0') throw new Error('package.json must declare Apache-2.0')
if (packageJson.private !== true) throw new Error('package remains private until a publishing ADR exists')

for (const path of ['adapters/deepseek-harness/provenance.json', 'adapters/invokta/provenance.json']) {
  const record = JSON.parse(await readFile(resolve(root, path), 'utf8'))
  if (!record.upstream || !record.observed || !record.license) throw new Error(`${path} is missing provenance fields`)
  if (record.supportStatus !== 'NOT_IMPLEMENTED') throw new Error(`${path} must not claim adapter support before implementation evidence`)
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
