import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const path = resolve(process.argv[2] ?? 'artifacts/reference/report.json')
const report = JSON.parse(await readFile(path, 'utf8'))

assert.equal(report.schema, 'actionseam.conformance-report/v0.1')
assert.equal(typeof report.reportDigest, 'string')
assert.ok(report.reportDigest.startsWith('sha256:'))
assert.ok(report.summary && typeof report.summary === 'object')
assert.ok(Array.isArray(report.results))

const failures = report.results
  .filter((row) => row.status === 'FAIL')
  .map((row) => ({
    profileId: row.profileId,
    summary: row.summary,
    counterexample: row.counterexample ?? null,
  }))

console.log(JSON.stringify({
  path,
  schema: report.schema,
  reportDigest: report.reportDigest,
  summary: report.summary,
  failures,
}, null, 2))
