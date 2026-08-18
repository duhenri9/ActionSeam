export class CommitUnknownError extends Error {
  constructor(effectId) {
    super(`Synthetic provider committed ${effectId}, then dropped the response.`)
    this.name = 'CommitUnknownError'
    this.code = 'COMMIT_UNKNOWN'
    this.effectId = effectId
  }
}

export class SyntheticStateStore {
  #resources = new Map()
  #effects = new Map()
  #attempts = []

  seed({ tenant, resource, value = 0, revision = 0 }) {
    this.#resources.set(`${tenant}:${resource}`, { tenant, resource, value, revision })
  }

  get({ tenant, resource }) {
    const key = `${tenant}:${resource}`
    const existing = this.#resources.get(key) ?? { tenant, resource, value: 0, revision: 0 }
    return structuredClone(existing)
  }

  async apply({ effectId, principal, tenant, resource, delta, expectedRevision, fault }) {
    const key = `${tenant}:${resource}`
    const before = this.get({ tenant, resource })
    this.#attempts.push({
      effectId,
      principal: structuredClone(principal),
      tenant,
      resource,
      delta,
      expectedRevision: expectedRevision ?? null,
      before,
      fault: fault ?? null,
    })

    if (this.#effects.has(effectId)) {
      return { ...structuredClone(this.#effects.get(effectId)), replayed: true }
    }

    if (expectedRevision !== undefined && expectedRevision !== before.revision) {
      const error = new Error(`Expected revision ${expectedRevision}, found ${before.revision}.`)
      error.name = 'StaleRevisionError'
      error.code = 'STALE_REVISION'
      error.currentRevision = before.revision
      throw error
    }

    const after = {
      tenant,
      resource,
      value: before.value + delta,
      revision: before.revision + 1,
    }
    this.#resources.set(key, after)

    const receipt = {
      ok: true,
      effectId,
      tenant,
      resource,
      revision: after.revision,
      value: after.value,
    }
    this.#effects.set(effectId, receipt)

    if (fault === 'drop-after-commit') {
      throw new CommitUnknownError(effectId)
    }

    if (fault === 'malformed-result-after-commit') {
      return { committed: true, opaque: 'synthetic-malformed-result' }
    }

    return structuredClone(receipt)
  }

  snapshot() {
    return {
      resources: [...this.#resources.values()].map((value) => structuredClone(value)),
      effects: [...this.#effects.values()].map((value) => structuredClone(value)),
      attempts: structuredClone(this.#attempts),
    }
  }
}
