import test from 'node:test'
import assert from 'node:assert/strict'

import { ReferenceRuntime, KnownBadRuntime } from '../../src/reference/runtime.js'
import { profiles } from '../../src/profiles/index.js'
import { runSuite } from '../../src/core/run-suite.js'
import { InvoktaActionTarget, normalizeInvoktaEvent } from './action-target.js'

const INVOKTA_PROFILE_IDS = new Set([
  'authority.approval-binding.v1',
  'authority.monotonic-deny.v1',
  'identity.external-principal.v1',
  'effects.idempotent-retry.v1',
  'contracts.input-validation.v1',
  'contracts.output-validation.v1',
  'effects.stale-revision.v1',
  'authority.untrusted-context.v1',
  'reconstruction.model-visible.v1',
  'isolation.tenant-boundary.v1',
  'isolation.secret-canary.v1',
])

const invoktaProfiles = profiles.filter((profile) => INVOKTA_PROFILE_IDS.has(profile.id))

test('real @invokta/core 0.6.0 completes its homologated reference-runtime profile matrix', async () => {
  const runtime = new ReferenceRuntime()
  const actionTarget = new InvoktaActionTarget()
  const rows = await runSuite({ runtime, actionTarget, profiles: invoktaProfiles })

  assert.equal(rows.length, INVOKTA_PROFILE_IDS.size)
  assert.deepEqual(new Set(rows.map((row) => row.result.status)), new Set(['PASS']))
  assert.equal(actionTarget.metadata.version, '0.6.0')
  assert.equal(actionTarget.metadata.transport, 'direct')
})

test('Invokta boundary changes the known-bad differential inside its homologated scope', async () => {
  const runtime = new KnownBadRuntime()
  const actionTarget = new InvoktaActionTarget()
  const rows = await runSuite({ runtime, actionTarget, profiles: invoktaProfiles })
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
  assert.equal(rows.some((row) => row.profileId === 'authority.approval-one-shot.v1'), false)
  assert.equal(rows.some((row) => row.profileId === 'contracts.argument-immutability.v1'), false)
})

test('Invokta engine events are captured as deterministic semantic adapter evidence', async () => {
  const runtime = new ReferenceRuntime()
  const actionTarget = new InvoktaActionTarget()
  const profile = invoktaProfiles.find((candidate) => candidate.id === 'contracts.input-validation.v1')
  const [row] = await runSuite({ runtime, actionTarget, profiles: [profile] })

  assert.equal(row.result.status, 'PASS')
  assert.ok(actionTarget.lastEngineEvents.some((event) => event.type === 'invocation.started'))
  assert.ok(actionTarget.lastEngineEvents.some((event) => event.type === 'invocation.failed'))
  const serialized = JSON.stringify(actionTarget.lastEngineEvents)
  assert.doesNotMatch(serialized, /startedAt/)
  assert.doesNotMatch(serialized, /durationMs/)
})

test('event normalization preserves semantic fields and excludes volatile timing', () => {
  assert.deepEqual(
    normalizeInvoktaEvent({
      type: 'invocation.started',
      requestId: 'r-1',
      capabilityId: 'c-1',
      source: 'direct',
      principalId: 'p-1',
      startedAt: 'volatile-time',
    }),
    {
      type: 'invocation.started',
      requestId: 'r-1',
      capabilityId: 'c-1',
      source: 'direct',
      principalId: 'p-1',
    },
  )
  assert.deepEqual(
    normalizeInvoktaEvent({
      type: 'invocation.failed',
      requestId: 'r-1',
      capabilityId: 'c-1',
      durationMs: 12.34,
      code: 'INPUT_INVALID',
    }),
    {
      type: 'invocation.failed',
      requestId: 'r-1',
      capabilityId: 'c-1',
      code: 'INPUT_INVALID',
    },
  )
})
