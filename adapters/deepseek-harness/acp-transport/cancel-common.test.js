import assert from 'node:assert/strict'
import test from 'node:test'

import {
  CANCEL_TOOL_NAME,
  CANCEL_USER_TEXT,
  PreDispatchCancelAdapter,
} from './cancel-common.js'

function validOptions(overrides = {}) {
  const controller = new AbortController()
  return {
    model: 'deterministic-cancel-v0',
    messages: [{ role: 'user', content: [{ type: 'text', text: CANCEL_USER_TEXT }] }],
    tools: [{ name: CANCEL_TOOL_NAME, description: 'test', parameters: {} }],
    signal: controller.signal,
    sessionId: 'actionseam-cancel-harness-test',
    ...overrides,
  }
}

test('validation failure rejects both cancellation observation channels', async () => {
  const adapter = new PreDispatchCancelAdapter()
  const started = adapter.whenStarted()
  const aborted = adapter.whenAborted()
  const iterator = adapter.stream(validOptions({ messages: [] }))

  await assert.rejects(iterator.next(), /input did not reach/)
  await assert.rejects(started, /input did not reach/)
  await assert.rejects(aborted, /input did not reach/)
})

test('start-evidence callback failure rejects both observation channels', async () => {
  const expected = new Error('synthetic start evidence failure')
  const adapter = new PreDispatchCancelAdapter({
    async onStart() {
      throw expected
    },
  })
  const started = adapter.whenStarted()
  const aborted = adapter.whenAborted()
  const iterator = adapter.stream(validOptions())

  await assert.rejects(iterator.next(), expected)
  await assert.rejects(started, expected)
  await assert.rejects(aborted, expected)
})
