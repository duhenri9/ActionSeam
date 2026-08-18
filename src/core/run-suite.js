import { SyntheticStateStore } from '../reference/effect-store.js'
import { profiles as defaultProfiles } from '../profiles/index.js'

export async function runProfile({ runtime, actionTarget, profile }) {
  const store = new SyntheticStateStore()
  for (const seed of profile.seed ?? []) store.seed(seed)

  const run = await runtime.execute({
    scenario: structuredClone(profile.scenario),
    actionTarget,
    store,
  })
  const snapshot = store.snapshot()
  const result = profile.evaluate({ profile, scenario: profile.scenario, run, snapshot })

  return {
    profileId: profile.id,
    profileTitle: profile.title,
    scenarioId: profile.scenario.id,
    result,
    subject: {
      runtime: runtime.metadata,
      actionTarget: actionTarget.metadata,
    },
    run: {
      outcome: run.outcome,
      result: run.result,
      principal: run.principal,
    },
    evidence: run.evidence,
    syntheticState: snapshot,
  }
}

export async function runSuite({ runtime, actionTarget, profiles = defaultProfiles }) {
  const results = []
  for (const profile of profiles) {
    results.push(await runProfile({ runtime, actionTarget, profile }))
  }
  return results
}
