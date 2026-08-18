import { ReferenceRuntime, KnownBadRuntime } from './reference/runtime.js'
import { ReferenceActionTarget, PermissiveActionTarget } from './reference/action-target.js'

export function createSubject(name) {
  if (name === 'reference') {
    return { runtime: new ReferenceRuntime(), actionTarget: new ReferenceActionTarget() }
  }
  if (name === 'known-bad') {
    return { runtime: new KnownBadRuntime(), actionTarget: new PermissiveActionTarget() }
  }
  return null
}
