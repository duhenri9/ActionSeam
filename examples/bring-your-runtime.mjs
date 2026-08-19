import assert from 'node:assert/strict'

import { digest } from '../src/core/digest.js'
import { runProfile } from '../src/core/run-suite.js'
import { profiles } from '../src/profiles/index.js'
import { ReferenceActionTarget } from '../src/reference/action-target.js'

const profile = profiles.find(({ id }) => id === 'authority.approval-binding.v1')
assert.ok(profile, 'approval-binding profile must exist')

function createExampleRuntimeAdapter({ id, enforceApprovalBinding }) {
  return {
    metadata: Object.freeze({
      id,
      version: 'example-v0',
      adapter: 'source-level-template',
    }),

    async execute({ scenario, actionTarget, store }) {
      const evidence = []
      const principal = structuredClone(scenario.trustedPrincipal)
      const approvedAction = structuredClone(scenario.action)
      const approvedDigest = digest(approvedAction)

      evidence.push({
        type: 'authority.approval',
        actionDigest: approvedDigest,
        status: 'approved',
        decision: 'allow-once',
      })

      let executionAction = structuredClone(approvedAction)
      if (scenario.disturbance?.type === 'mutate-after-approval') {
        executionAction = {
          ...executionAction,
          input: {
            ...executionAction.input,
            ...structuredClone(scenario.disturbance.patch),
          },
        }
        evidence.push({
          type: 'disturbance.action-mutated',
          beforeDigest: approvedDigest,
          afterDigest: digest(executionAction),
        })
      }

      if (enforceApprovalBinding && digest(executionAction) !== approvedDigest) {
        evidence.push({
          type: 'action.terminal',
          outcome: 'BLOCKED_STALE_APPROVAL',
        })
        return {
          outcome: 'BLOCKED_STALE_APPROVAL',
          principal,
          evidence,
          result: null,
        }
      }

      const effectId = `effect:${digest({
        scenarioId: scenario.id,
        principal,
        action: executionAction,
      })}`
      const result = await actionTarget.invoke({
        action: executionAction,
        principal,
        effectId,
        store,
      })
      evidence.push({
        type: 'action.attempt',
        effectId,
        result: structuredClone(result),
      })

      const outcome = result.ok ? 'COMPLETED' : 'ACTION_FAILED'
      evidence.push({
        type: 'action.terminal',
        outcome,
        result: structuredClone(result),
      })

      return {
        outcome,
        principal,
        evidence,
        result,
      }
    },
  }
}

const actionTarget = new ReferenceActionTarget()

const candidate = await runProfile({
  runtime: createExampleRuntimeAdapter({
    id: 'example.candidate-runtime-adapter',
    enforceApprovalBinding: true,
  }),
  actionTarget,
  profile,
})

const negativeControl = await runProfile({
  runtime: createExampleRuntimeAdapter({
    id: 'example.unbound-negative-control',
    enforceApprovalBinding: false,
  }),
  actionTarget,
  profile,
})

assert.equal(candidate.result.status, 'PASS')
assert.equal(candidate.run.outcome, 'BLOCKED_STALE_APPROVAL')
assert.equal(candidate.syntheticState.effects.length, 0)
assert.equal(negativeControl.result.status, 'FAIL')
assert.equal(negativeControl.syntheticState.effects.length, 1)

console.log(JSON.stringify({
  profileId: profile.id,
  mechanism: 'Compare the approved material action digest with the execution action before dispatch.',
  candidate: {
    status: candidate.result.status,
    outcome: candidate.run.outcome,
    committedEffects: candidate.syntheticState.effects.length,
  },
  negativeControl: {
    status: negativeControl.result.status,
    outcome: negativeControl.run.outcome,
    committedEffects: negativeControl.syntheticState.effects.length,
    detectedCounterexample: Boolean(negativeControl.result.counterexample),
  },
  nextStep: 'Replace the example execute seam with a real, exact-version runtime boundary and keep the negative control before promoting any support claim.',
}, null, 2))
