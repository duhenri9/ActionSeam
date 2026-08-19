import assert from 'node:assert/strict'

import { runProbe } from './probe.js'

const result = await runProbe()

assert.equal(result.upstreamVersion, '0.1.0-rc.7')
assert.equal(result.upstreamCommit, '99f6f02fecdb7dff40c3fbc9470f5907c29f74ca')
assert.equal(result.supportStatus, 'NOT_IMPLEMENTED')
assert.equal(result.probeKind, 'public-surface-bootstrap')
assert.equal(result.llmProviderRegistered, true)
assert.equal(result.toolRegistered, true)
assert.equal(result.noModelNetworkCall, true)
assert.equal(result.noToolExecution, true)
assert.deepEqual(result.services, [
  'llm',
  'sessions',
  'systemPrompt',
  'tools',
  'agents',
  'invariants',
  'agentLoop',
])

console.log('DeepSeek Harness public-surface bootstrap probe passed.')
