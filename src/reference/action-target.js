function validateAction(action) {
  if (!action || action.capability !== 'synthetic.adjust-balance') {
    return { ok: false, code: 'CAPABILITY_INVALID' }
  }

  const input = action.input
  if (!input || typeof input !== 'object') return { ok: false, code: 'INPUT_INVALID' }
  if (typeof input.tenant !== 'string' || input.tenant.length === 0) return { ok: false, code: 'INPUT_INVALID' }
  if (typeof input.resource !== 'string' || input.resource.length === 0) return { ok: false, code: 'INPUT_INVALID' }
  if (typeof input.amount !== 'number' || !Number.isFinite(input.amount)) return { ok: false, code: 'INPUT_INVALID' }
  if (input.expectedRevision !== undefined && (!Number.isInteger(input.expectedRevision) || input.expectedRevision < 0)) {
    return { ok: false, code: 'INPUT_INVALID' }
  }
  return { ok: true }
}

function validateProviderResult(result) {
  return Boolean(
    result &&
      result.ok === true &&
      typeof result.effectId === 'string' &&
      typeof result.tenant === 'string' &&
      typeof result.resource === 'string' &&
      Number.isInteger(result.revision) &&
      typeof result.value === 'number',
  )
}

export class ReferenceActionTarget {
  metadata = Object.freeze({ id: 'actionseam.reference-action-target', version: '0.1.0', transport: 'direct' })

  async invoke({ action, principal, effectId, store, fault }) {
    const validation = validateAction(action)
    if (!validation.ok) return { ok: false, code: validation.code, stage: 'input-validation' }

    if (!principal || typeof principal.id !== 'string' || typeof principal.tenant !== 'string') {
      return { ok: false, code: 'UNAUTHENTICATED', stage: 'identity' }
    }

    if (principal.tenant !== action.input.tenant) {
      return { ok: false, code: 'FORBIDDEN', stage: 'tenant-boundary' }
    }

    try {
      const providerResult = await store.apply({
        effectId,
        principal,
        tenant: action.input.tenant,
        resource: action.input.resource,
        delta: action.input.amount,
        expectedRevision: action.input.expectedRevision,
        fault,
      })

      if (!validateProviderResult(providerResult)) {
        return { ok: false, code: 'OUTPUT_INVALID', stage: 'output-validation' }
      }

      return { ok: true, value: providerResult }
    } catch (error) {
      if (error?.code === 'COMMIT_UNKNOWN') {
        return { ok: false, code: 'COMMIT_UNKNOWN', stage: 'provider', commitUnknown: true }
      }
      if (error?.code === 'STALE_REVISION') {
        return { ok: false, code: 'STALE_REVISION', stage: 'provider', currentRevision: error.currentRevision }
      }
      return { ok: false, code: 'EXECUTION_FAILED', stage: 'provider' }
    }
  }
}

export class PermissiveActionTarget {
  metadata = Object.freeze({ id: 'actionseam.known-bad-action-target', version: '0.1.0-test-subject', transport: 'direct' })

  async invoke({ action, principal, effectId, store, fault }) {
    const input = action?.input ?? {}
    const amount = typeof input.amount === 'number' ? input.amount : Number(input.amount)
    const tenant = typeof input.tenant === 'string' ? input.tenant : principal?.tenant ?? 'tenant-unknown'
    const resource = typeof input.resource === 'string' ? input.resource : 'resource-unknown'

    try {
      const providerResult = await store.apply({
        effectId,
        principal: principal ?? { id: 'anonymous', tenant },
        tenant,
        resource,
        delta: Number.isFinite(amount) ? amount : 0,
        // Deliberately ignores expectedRevision to model a broken boundary.
        fault,
      })
      // Deliberately treats any provider return shape as success.
      return { ok: true, value: providerResult }
    } catch (error) {
      if (error?.code === 'COMMIT_UNKNOWN') {
        return { ok: false, code: 'COMMIT_UNKNOWN', commitUnknown: true }
      }
      return { ok: false, code: error?.code ?? 'EXECUTION_FAILED' }
    }
  }
}
