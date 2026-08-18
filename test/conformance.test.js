import test from 'node:test'
import assert from 'node:assert/strict'
import { profiles } from '../src/profiles/index.js'
import { createSubject } from '../src/subjects.js'
import { runSuite } from '../src/core/run-suite.js'
import { buildReport } from '../src/reporting/report.js'
import { renderInspector } from '../src/reporting/inspector.js'

test('reference subject preserves every shipped v0 profile', async () => {
  const subject = createSubject('reference')
  const results = await runSuite({ ...subject, profiles })
  assert.equal(results.length, profiles.length)
  assert.deepEqual(new Set(results.map((row) => row.result.status)), new Set(['PASS']))
})

test('known-bad subject demonstrates that every shipped validator can fail', async () => {
  const subject = createSubject('known-bad')
  const results = await runSuite({ ...subject, profiles })
  assert.equal(results.length, profiles.length)
  assert.deepEqual(new Set(results.map((row) => row.result.status)), new Set(['FAIL']))
  for (const row of results) {
    assert.equal(row.result.counterexample.profileId, undefined)
    assert.equal(row.result.counterexample.scenarioId, row.scenarioId)
    assert.match(row.result.counterexample.reproduce, /node src\/cli\.js run/)
  }
})

test('report uses explicit result vocabulary and deterministic digest', async () => {
  const subject = createSubject('reference')
  const results = await runSuite({ ...subject, profiles })
  const first = buildReport({ ...subject, results })
  const second = buildReport({ ...subject, results })
  assert.equal(first.summary.PASS, profiles.length)
  assert.equal(first.summary.FAIL, 0)
  assert.equal(first.summary.UNSUPPORTED, 0)
  assert.equal(first.summary.NOT_TESTED, 0)
  assert.equal(first.summary.INDETERMINATE, 0)
  assert.equal(first.reportDigest, second.reportDigest)
  assert.match(first.reportDigest, /^sha256:[a-f0-9]{64}$/)
})

test('inspector includes profile identity, explicit states, and report digest', async () => {
  const subject = createSubject('known-bad')
  const results = await runSuite({ ...subject, profiles: profiles.slice(0, 2) })
  const report = buildReport({ ...subject, results })
  const html = renderInspector(report)
  assert.match(html, /ActionSeam · Inspector/)
  assert.match(html, /FAIL/)
  assert.match(html, /Counterexample/)
  assert.match(html, /sha256:/)
})
