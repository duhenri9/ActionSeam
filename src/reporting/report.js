import { digest } from '../core/digest.js'
import { ResultStatus } from '../core/constants.js'

export function buildReport({ runtime, actionTarget, results }) {
  const summary = Object.fromEntries(Object.values(ResultStatus).map((status) => [status, 0]))
  for (const row of results) summary[row.result.status] = (summary[row.result.status] ?? 0) + 1

  const deterministicBody = {
    schema: 'actionseam.conformance-report/v0.1',
    subject: {
      runtime: structuredClone(runtime.metadata),
      actionTarget: structuredClone(actionTarget.metadata),
    },
    summary,
    results: results.map((row) => ({
      profileId: row.profileId,
      profileTitle: row.profileTitle,
      scenarioId: row.scenarioId,
      status: row.result.status,
      evidenceRefs: row.result.evidenceRefs ?? [],
      summary: row.result.summary ?? null,
      counterexample: row.result.counterexample ?? null,
      run: row.run,
    })),
  }

  return {
    ...deterministicBody,
    reportDigest: digest(deterministicBody),
  }
}
