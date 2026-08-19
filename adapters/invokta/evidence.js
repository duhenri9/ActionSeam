import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

import { ReferenceRuntime, KnownBadRuntime } from '../../src/reference/runtime.js'
import { profiles } from '../../src/profiles/index.js'
import { runSuite } from '../../src/core/run-suite.js'
import { buildReport } from '../../src/reporting/report.js'
import { renderInspector } from '../../src/reporting/inspector.js'
import { InvoktaActionTarget } from './action-target.js'

async function writeSubjectEvidence(name, runtime) {
  const actionTarget = new InvoktaActionTarget()
  const rows = await runSuite({ runtime, actionTarget, profiles })
  const report = buildReport({ runtime, actionTarget, results: rows })
  const output = resolve('artifacts', name)
  await mkdir(output, { recursive: true })
  await writeFile(resolve(output, 'report.json'), `${JSON.stringify(report, null, 2)}\n`)
  await writeFile(resolve(output, 'inspector.html'), renderInspector(report))
  return { name, report }
}

const reference = await writeSubjectEvidence('reference-runtime', new ReferenceRuntime())
const knownBad = await writeSubjectEvidence('known-bad-runtime', new KnownBadRuntime())

if (reference.report.summary.PASS !== profiles.length || reference.report.summary.FAIL !== 0) {
  throw new Error(`Invokta reference-runtime matrix did not pass all ${profiles.length} profiles.`)
}

console.log(JSON.stringify({
  upstream: '@invokta/core@0.6.0',
  transport: 'direct',
  reference: {
    summary: reference.report.summary,
    reportDigest: reference.report.reportDigest,
  },
  knownBad: {
    summary: knownBad.report.summary,
    reportDigest: knownBad.report.reportDigest,
  },
}, null, 2))
