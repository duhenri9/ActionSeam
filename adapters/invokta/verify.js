import test from 'node:test'
import assert from 'node:assert/strict'

import { ReferenceRuntime, KnownBadRuntime } from '../../src/reference/runtime.js'
import { profiles } from '../../src/profiles/index.js'
import { runSuite } from '../../src/core/run-suite.js'
import { InvoktaActionTarget } from './action-target.js'

test('real @invokta/core 0.6.0 completes the full reference-runtime profile matrix', async () => {
  const runtime = new ReferenceRuntime()
  const actionTarget = new InvoktaActionTarget()
  const rows = await runSuite({ runtime, actionTarget, profiles })

  assert.equal(rows.length, 11)
  assert.deepEqual(new Set(rows.map((row) => row.result.status)), new Set(['PASS']))
  assert.equal(actionTarget.metadata.version, '0.6.0')
  assert.equal(actionTarget.metadata.transport, 'direct')
})

test('Invokta boundary changes the known-bad differential instead of trivially passing or failing everything', async () => {
  const runtime = new KnownBadRuntime()
  const actionTarget = new InvoktaActionTarget()
  const rows = await runSuite({ runtime, actionTarget, profiles })
  const pass = rows.filter((row) => row.result.status === 'PASS').map((row) => row.profileId)
  const fail = rows.filter((row) => row.result.status === 'FAIL').map((row) => row.profileId)

  assert.ok(pass.length > 0, 'Invokta boundary should preserve some invariants even with the known-bad runtime')
  assert.ok(fail.length > 0, 'Invokta boundary must not mask known-bad runtime failures')
  assert.ok(pass.includes('contracts.input-validation.v1'))
  assert.ok(pass.includes('contracts.output-validation.v1'))
  assert.ok(pass.includes('effects.stale-revision.v1'))
  assert.ok(pass.includes('isolation.tenant-boundary.v1'))
  assert.ok(fail.includes('authority.approval-binding.v1'))
  assert.ok(fail.includes('authority.monotonic-deny.v1'))
  assert.ok(fail.includes('reconstruction.model-visible.v1'))
})

test('Invokta engine events are captured as adapter evidence', async () => {
  const runtime = new ReferenceRuntime()
  const actionTarget = new InvoktaActionTarget()
  const profile = profiles.find((candidate) => candidate.id === 'contracts.input-validation.v1')
  const [row] = await runSuite({ runtime, actionTarget, profiles: [profile] })

  assert.equal(row.result.status, 'PASS')
  assert.ok(actionTarget.lastEngineEvents.some((event) => event.type === 'invocation.started'))
  assert.ok(actionTarget.lastEngineEvents.some((event) => event.type === 'invocation.failed'))
})
