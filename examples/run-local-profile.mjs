import assert from 'node:assert/strict'

import { runProfile } from '../src/core/run-suite.js'
import { createSubject } from '../src/subjects.js'

const profile = {
  id: 'example.valid-effect.v0',
  title: 'A valid synthetic action commits exactly one expected effect',
  expectation: 'The valid action should commit exactly one synthetic effect with value 5.',
  scenario: {
    id: 'example-valid-effect',
    trustedPrincipal: { id: 'example-operator', tenant: 'tenant-A' },
    action: {
      capability: 'synthetic.adjust-balance',
      input: {
        tenant: 'tenant-A',
        resource: 'example-account',
        amount: 5,
      },
    },
    policy: ['allow'],
    context: [],
  },
  evaluate({ profile: activeProfile, scenario, run, snapshot }) {
    const effect = snapshot.effects[0]
    if (
      run.outcome === 'COMPLETED'
      && snapshot.effects.length === 1
      && effect?.tenant === 'tenant-A'
      && effect?.resource === 'example-account'
      && effect?.value === 5
    ) {
      return {
        status: 'PASS',
        profileId: activeProfile.id,
        evidenceRefs: ['action.attempt', 'action.terminal'],
      }
    }

    return {
      status: 'FAIL',
      profileId: activeProfile.id,
      summary: 'The example profile did not observe the one expected committed effect.',
      counterexample: {
        scenarioId: scenario.id,
        expected: activeProfile.expectation,
        observed: {
          outcome: run.outcome,
          effects: snapshot.effects,
        },
      },
    }
  },
}

const subject = createSubject('reference')
assert.ok(subject, 'reference subject must exist')

const row = await runProfile({ ...subject, profile })
assert.equal(row.result.status, 'PASS')

console.log(JSON.stringify({
  profileId: row.profileId,
  scenarioId: row.scenarioId,
  status: row.result.status,
  evidenceRefs: row.result.evidenceRefs,
  committedEffects: row.syntheticState.effects,
}, null, 2))
