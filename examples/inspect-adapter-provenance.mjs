import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const path = resolve(process.argv[2] ?? 'adapters/deepseek-harness/provenance.json')
const record = JSON.parse(await readFile(path, 'utf8'))

assert.equal(record.schema, 'actionseam.adapter-provenance/v1')
assert.equal(typeof record.upstream, 'string')
assert.ok(['NOT_IMPLEMENTED', 'PARTIAL', 'SUPPORTED'].includes(record.supportStatus))
assert.ok(record.observed?.commit, 'adapter provenance must pin an observed upstream commit')

console.log(JSON.stringify({
  path,
  upstream: record.upstream,
  package: record.package ?? null,
  packageVersion: record.packageVersion ?? null,
  supportStatus: record.supportStatus,
  observed: record.observed,
  supportedProfiles: record.supportedProfiles ?? [],
  verifiedTransports: Object.fromEntries(
    Object.entries(record.verifiedTransports ?? {}).map(([name, transport]) => [
      name,
      { status: transport.status ?? null },
    ]),
  ),
  claimReminder: 'PARTIAL and SUPPORTED remain scoped to the exact evidence recorded here.',
}, null, 2))
