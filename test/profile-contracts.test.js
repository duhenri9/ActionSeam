import test from 'node:test'
import assert from 'node:assert/strict'
import { profiles } from '../src/profiles/index.js'
import { ResultStatus } from '../src/core/constants.js'

const allowed = new Set(Object.values(ResultStatus))

test('profile ids and scenario ids are unique', () => {
  assert.equal(new Set(profiles.map((profile) => profile.id)).size, profiles.length)
  assert.equal(new Set(profiles.map((profile) => profile.scenario.id)).size, profiles.length)
})

test('profiles declare human-readable title and expectation', () => {
  for (const profile of profiles) {
    assert.ok(profile.title.length > 10)
    assert.ok(profile.expectation.length > 20)
    assert.equal(typeof profile.evaluate, 'function')
  }
})

test('result vocabulary remains closed', () => {
  assert.deepEqual(allowed, new Set(['PASS', 'FAIL', 'UNSUPPORTED', 'NOT_TESTED', 'INDETERMINATE']))
})
