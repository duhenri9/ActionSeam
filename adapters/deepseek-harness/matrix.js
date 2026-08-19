import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

import { profiles } from '../../src/profiles/index.js'
import { runSuite } from '../../src/core/run-suite.js'
import { KnownBadRuntime } from '../../src/reference/runtime.js'
import { PermissiveActionTarget } from '../../src/reference/action-target.js'
import { buildReport } from '../../src/reporting/report.js'
import { renderInspector } from '../../src/reporting/inspector.js'
import { DeepSeekHarnessExtendedRuntime } from './runtime-extended.js'

const profileIds = [
  'authority.approval-one-shot.v1',
  'authority.monotonic-deny.v1',
  'contracts.input-validation.v1',
  'contracts.argument-immutability.v1',
  'contracts.output-validation.v1',
  'authority.untrusted-context.v1',
  'reconstruction.model-visible.v1',
]

const selected = profileIds.map((id) => {
  const profile = profiles.find((candidate) => candidate.id === id)
  assert.ok(profile, `Missing ActionSeam profile ${id}`)
  return profile
})

const permissiveTarget = new PermissiveActionTarget()
const dshRuntime = new DeepSeekHarnessExtendedRuntime()
const dshRows = await runSuite({
  runtime: dshRuntime,
  actionTarget: permissiveTarget,
  profiles: selected,
})

const dshStatuses = Object.fromEntries(dshRows.map((row) => [row.profileId, row.result.status]))
for (const id of profileIds) {
  assert.equal(dshStatuses[id], 'PASS', `DeepSeek Harness candidate must PASS ${id}`)
}

const knownBadRuntime = new KnownBadRuntime()
const controlTarget = new PermissiveActionTarget()
const controlRows = await runSuite({
  runtime: knownBadRuntime,
  actionTarget: controlTarget,
  profiles: selected,
})

const controlStatuses = Object.fromEntries(controlRows.map((row) => [row.profileId, row.result.status]))
for (const id of profileIds) {
  assert.equal(controlStatuses[id], 'FAIL', `KnownBadRuntime control must FAIL ${id}`)
}

const dshReport = buildReport({ runtime: dshRuntime, actionTarget: permissiveTarget, results: dshRows })
const controlReport = buildReport({ runtime: knownBadRuntime, actionTarget: controlTarget, results: controlRows })

const output = resolve('artifacts', 'profile-matrix')
await mkdir(output, { recursive: true })
await writeFile(resolve(output, 'deepseek-harness-report.json'), `${JSON.stringify(dshReport, null, 2)}\n`)
await writeFile(resolve(output, 'deepseek-harness-inspector.html'), renderInspector(dshReport))
await writeFile(resolve(output, 'known-bad-control-report.json'), `${JSON.stringify(controlReport, null, 2)}\n`)
await writeFile(resolve(output, 'known-bad-control-inspector.html'), renderInspector(controlReport))
await writeFile(resolve(output, 'deepseek-harness-raw-evidence.json'), `${JSON.stringify(dshRows.map((row) => ({
  profileId: row.profileId,
  status: row.result.status,
  evidence: row.evidence,
  syntheticState: row.syntheticState,
})), null, 2)}\n`)

console.log(JSON.stringify({
  upstream: '@deepseek-ai/dsh@0.1.0-rc.7',
  upstreamCommit: '99f6f02fecdb7dff40c3fbc9470f5907c29f74ca',
  evidenceSupports: 'PARTIAL',
  candidateProfiles: profileIds,
  candidate: {
    pass: dshReport.summary.PASS,
    fail: dshReport.summary.FAIL,
    reportDigest: dshReport.reportDigest,
    statuses: dshStatuses,
  },
  knownBadControl: {
    pass: controlReport.summary.PASS,
    fail: controlReport.summary.FAIL,
    reportDigest: controlReport.reportDigest,
    statuses: controlStatuses,
  },
  attributionBoundary: {
    dshOwned: {
      'authority.approval-one-shot.v1': '@deepseek-ai/dsh-user-approval allowed-once plus ToolRuntime ask integration; each call creates its own durable approval audit pair.',
      'authority.monotonic-deny.v1': 'ToolRuntime monotonic guard after extensible pre-execute policy.',
      'contracts.input-validation.v1': 'ToolRuntime argument validation before body execution.',
      'contracts.argument-immutability.v1': 'ToolRuntime lossless argument snapshot + deep freeze before policy; around-dispatch cannot rewrite arguments.',
      'contracts.output-validation.v1': 'ToolRuntime canonical output validation after body execution.',
      'authority.untrusted-context.v1': 'Binding ToolRuntime guard remains final after an adversarial pre-execute allow attempt.',
      'reconstruction.model-visible.v1': 'AgentLoop durable request-reconstruction invariant plus ActionSeam structural material verification.',
    },
    actionTarget: 'PermissiveActionTarget intentionally provides no validating safety net.',
    notClaimed: [
      'authority.approval-binding.v1',
      'identity.external-principal.v1',
      'effects.idempotent-retry.v1',
      'effects.stale-revision.v1',
      'isolation.tenant-boundary.v1',
      'isolation.secret-canary.v1',
    ],
  },
}, null, 2))
