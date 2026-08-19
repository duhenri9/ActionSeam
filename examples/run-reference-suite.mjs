import assert from 'node:assert/strict'

import { runSuite } from '../src/core/run-suite.js'
import { profiles } from '../src/profiles/index.js'
import { buildReport } from '../src/reporting/report.js'
import { createSubject } from '../src/subjects.js'

const subject = createSubject('reference')
assert.ok(subject, 'reference subject must exist')

const results = await runSuite({ ...subject, profiles })
const report = buildReport({ ...subject, results })

assert.equal(report.summary.PASS, profiles.length)
assert.equal(report.summary.FAIL, 0)

console.log(JSON.stringify({
  subject: 'reference',
  profiles: profiles.length,
  summary: report.summary,
  reportDigest: report.reportDigest,
}, null, 2))
