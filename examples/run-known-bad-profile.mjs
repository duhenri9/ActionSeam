import assert from 'node:assert/strict'

import { runProfile } from '../src/core/run-suite.js'
import { findProfile } from '../src/profiles/index.js'
import { createSubject } from '../src/subjects.js'

const profile = findProfile('authority.approval-binding.v1')
const subject = createSubject('known-bad')

assert.ok(profile, 'approval-binding profile must exist')
assert.ok(subject, 'known-bad subject must exist')

const row = await runProfile({ ...subject, profile })
assert.equal(row.result.status, 'FAIL')
assert.ok(row.result.counterexample, 'known-bad failure must include a counterexample')

console.log(JSON.stringify({
  profileId: row.profileId,
  status: row.result.status,
  summary: row.result.summary,
  counterexample: row.result.counterexample,
}, null, 2))
