import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

import { ReferenceRuntime, KnownBadRuntime } from '../../src/reference/runtime.js'
import { profiles } from '../../src/profiles/index.js'
import { runSuite } from '../../src/core/run-suite.js'
import { buildReport } from '../../src/reporting/report.js'
import { renderInspector } from '../../src/reporting/inspector.js'
import { InvoktaActionTarget } from './action-target.js'

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

async function writeSubjectEvidence(name, runtime) {
  const actionTarget = new InvoktaActionTarget()
  const rows = await runSuite({ runtime, actionTarget, profiles: invoktaProfiles })
  const report = buildReport({ runtime, actionTarget, results: rows })
  const output = resolve('artifacts', name)
  await mkdir(output, { recursive: true })
  await writeFile(resolve(output, 'report.json'), `${JSON.stringify(report, null, 2)}\n`)
  await writeFile(resolve(output, 'inspector.html'), renderInspector(report))
  return { name, report }
}

const reference = await writeSubjectEvidence('reference-runtime', new ReferenceRuntime())
const knownBad = await writeSubjectEvidence('known-bad-runtime', new KnownBadRuntime())

if (reference.report.summary.PASS !== invoktaProfiles.length || reference.report.summary.FAIL !== 0) {
  throw new Error(`Invokta reference-runtime matrix did not pass all ${invoktaProfiles.length} homologated profiles.`)
}

console.log(JSON.stringify({
  upstream: '@invokta/core@0.6.0',
  transport: 'direct',
  evidenceScope: 'homologated-11-profiles',
  excludedNewProfiles: [
    'authority.approval-one-shot.v1',
    'contracts.argument-immutability.v1',
  ],
  reference: {
    summary: reference.report.summary,
    reportDigest: reference.report.reportDigest,
  },
  knownBad: {
    summary: knownBad.report.summary,
    reportDigest: knownBad.report.reportDigest,
  },
}, null, 2))
