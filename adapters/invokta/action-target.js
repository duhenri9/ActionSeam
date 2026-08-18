import {
  createEngine,
  defineCapability,
  EngineError,
} from '@invokta/core'
import { z } from 'zod'

const capabilityId = 'synthetic.adjust-balance'

const inputSchema = z.object({
  tenant: z.string().min(1),
  resource: z.string().min(1),
  amount: z.number().finite(),
  expectedRevision: z.number().int().nonnegative().optional(),
})

const outputSchema = z.object({
  ok: z.literal(true),
  effectId: z.string().min(1),
  tenant: z.string().min(1),
  resource: z.string().min(1),
  revision: z.number().int().nonnegative(),
  value: z.number().finite(),
}).strict()

function toInvoktaPrincipal(principal) {
  if (!principal) return null
  return Object.freeze({
    id: principal.id,
    attributes: Object.freeze({ tenant: principal.tenant }),
  })
}

function toActionSeamPrincipal(principal) {
  if (!principal) return null
  return {
    id: principal.id,
    tenant: principal.attributes?.tenant,
  }
}

function normalizeCommittedResult(result) {
  if (result?.ok !== true) return result
  return {
    ok: true,
    effectId: result.effectId,
    tenant: result.tenant,
    resource: result.resource,
    revision: result.revision,
    value: result.value,
  }
}

function createSyntheticCapability({ store, effectId, fault }) {
  return defineCapability({
    title: 'Adjust a synthetic balance',
    description: 'Mutates ActionSeam synthetic state for conformance testing.',
    input: inputSchema,
    output: outputSchema,
    access: ({ principal, input }) =>
      principal !== null && principal.attributes?.tenant === input.tenant,
    annotations: {
      readOnly: false,
      destructive: true,
      idempotent: true,
      openWorld: false,
    },
    async run({ input, context }) {
      const principal = toActionSeamPrincipal(context.principal)
      try {
        const result = await store.apply({
          effectId,
          principal,
          tenant: input.tenant,
          resource: input.resource,
          delta: input.amount,
          expectedRevision: input.expectedRevision,
          fault,
        })
        return normalizeCommittedResult(result)
      } catch (error) {
        if (error?.code === 'COMMIT_UNKNOWN') {
          throw new EngineError({
            code: 'EXECUTION_FAILED',
            message: 'Synthetic provider commit outcome is unknown to the caller.',
            publicDetails: { actionSeamCode: 'COMMIT_UNKNOWN', effectId },
            cause: error,
          })
        }
        if (error?.code === 'STALE_REVISION') {
          throw new EngineError({
            code: 'EXECUTION_FAILED',
            message: 'Synthetic provider rejected a stale expected revision.',
            publicDetails: {
              actionSeamCode: 'STALE_REVISION',
              currentRevision: error.currentRevision,
            },
            cause: error,
          })
        }
        throw error
      }
    },
  })
}

function stageForEngineCode(code) {
  if (code === 'INPUT_INVALID') return 'input-validation'
  if (code === 'OUTPUT_INVALID') return 'output-validation'
  if (code === 'UNAUTHENTICATED' || code === 'FORBIDDEN') return 'access'
  return 'execution'
}

export class InvoktaActionTarget {
  metadata = Object.freeze({
    id: 'invokta.action-engine',
    version: '0.6.0',
    adapter: 'actionseam.invokta-action-target',
    adapterVersion: '0.1.0-experimental',
    transport: 'direct',
    upstreamCommit: '10648f80a1df9cbe21e99eb3119772f3ad824b12',
  })

  lastEngineEvents = []

  async invoke({ action, principal, effectId, store, fault }) {
    if (!action || action.capability !== capabilityId) {
      return { ok: false, code: 'CAPABILITY_INVALID', stage: 'adapter' }
    }

    const engineEvents = []
    const engine = createEngine({
      name: 'actionseam-invokta-verification',
      version: '0.1.0',
      capabilities: {
        [capabilityId]: createSyntheticCapability({ store, effectId, fault }),
      },
      onEvent(event) {
        engineEvents.push(structuredClone(event))
      },
    })

    try {
      const value = await engine.invoke(capabilityId, action.input, {
        requestId: effectId,
        source: 'direct',
        principal: toInvoktaPrincipal(principal),
      })
      this.lastEngineEvents = structuredClone(engineEvents)
      return {
        ok: true,
        value,
        adapterEvidence: { engineEvents: structuredClone(engineEvents) },
      }
    } catch (error) {
      this.lastEngineEvents = structuredClone(engineEvents)
      if (error instanceof EngineError) {
        const actionSeamCode = error.publicDetails?.actionSeamCode
        return {
          ok: false,
          code: actionSeamCode ?? error.code,
          upstreamCode: error.code,
          stage: stageForEngineCode(error.code),
          commitUnknown: actionSeamCode === 'COMMIT_UNKNOWN',
          publicDetails: error.publicDetails ?? null,
          adapterEvidence: { engineEvents: structuredClone(engineEvents) },
        }
      }
      throw error
    }
  }
}
