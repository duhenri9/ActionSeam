export const PERMISSION_DECISIONS = Object.freeze(['allow-once', 'reject-once'])

export function normalizePermissionSnapshot(snapshot, toolExecutions) {
  const effect = snapshot.effects[0]
  const attempt = snapshot.attempts[0]
  return {
    toolExecutions,
    effect: effect ? {
      tenant: effect.tenant,
      resource: effect.resource,
      revision: effect.revision,
      value: effect.value,
    } : null,
    attempt: attempt ? {
      tenant: attempt.tenant,
      resource: attempt.resource,
      delta: attempt.delta,
    } : null,
  }
}

export function expectedApprovalOutcome(decision) {
  if (decision === 'allow-once') return 'allowed-once'
  if (decision === 'reject-once') return 'rejected'
  throw new Error(`Unsupported permission decision: ${decision}`)
}

export async function waitForServices(ctx, names, timeoutMs = 3000) {
  const started = Date.now()
  for (;;) {
    const missing = names.filter((name) => ctx.get(name) === undefined)
    if (missing.length === 0) return
    if (Date.now() - started >= timeoutMs) throw new Error(`Missing DSH services: ${missing.join(', ')}`)
    await new Promise((resolve) => setTimeout(resolve, 25))
  }
}
