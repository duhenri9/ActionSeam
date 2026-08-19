import { LlmAdapter } from '@deepseek-ai/dsh-llm'
import { defineTool } from '@deepseek-ai/dsh-tools'

import { PermissiveActionTarget } from '../../../src/reference/action-target.js'
import { SyntheticStateStore } from '../../../src/reference/effect-store.js'

export const CANCEL_PROVIDER = 'actionseam-cancel-synthetic'
export const CANCEL_MODEL = 'deterministic-cancel-v0'
export const CANCEL_TOOL_NAME = 'actionseam_cancel_adjust'
export const CANCEL_USER_TEXT = 'Start the ActionSeam ACP cancellation probe and wait before tool dispatch.'

export class PreDispatchCancelAdapter extends LlmAdapter {
  requests = []
  abortObserved = false

  #started = Promise.withResolvers()
  #aborted = Promise.withResolvers()
  #onStart
  #onAbort

  constructor({ onStart, onAbort } = {}) {
    super()
    this.#onStart = onStart
    this.#onAbort = onAbort

    // These deferreds are observation channels for the probe. Mark them as
    // internally handled so an early stream failure cannot become a process-
    // level unhandled rejection before the harness attaches its real await.
    this.#started.promise.catch(() => {})
    this.#aborted.promise.catch(() => {})
  }

  whenStarted() {
    return this.#started.promise
  }

  whenAborted() {
    return this.#aborted.promise
  }

  async * stream(options) {
    try {
      this.requests.push({
        model: options.model,
        messages: structuredClone(options.messages),
        tools: structuredClone(options.tools ?? []),
        sessionId: options.sessionId ?? null,
        signalPresent: options.signal instanceof AbortSignal,
      })

      if (this.requests.length !== 1) {
        throw new Error(`Cancellation probe expected one model request, got ${this.requests.length}.`)
      }

      const serializedMessages = JSON.stringify(options.messages)
      const serializedTools = JSON.stringify(options.tools ?? [])
      if (!serializedMessages.includes(CANCEL_USER_TEXT)) {
        throw new Error('Cancellation probe input did not reach the real DSH model request.')
      }
      if (!serializedTools.includes(CANCEL_TOOL_NAME)) {
        throw new Error('Cancellation probe tool was not visible in the real DSH model request.')
      }
      if (!(options.signal instanceof AbortSignal)) {
        throw new Error('Cancellation probe model request did not receive an AbortSignal.')
      }

      const startEvidence = {
        requestCount: this.requests.length,
        sessionId: options.sessionId ?? null,
        signalPresent: true,
        signalAbortedAtStart: options.signal.aborted,
        networkModelCalls: 0,
      }
      await this.#onStart?.(startEvidence)
      this.#started.resolve(structuredClone(startEvidence))

      if (!options.signal.aborted) {
        await new Promise((resolve) => {
          options.signal.addEventListener('abort', resolve, { once: true })
        })
      }

      this.abortObserved = true
      const abortEvidence = {
        requestCount: this.requests.length,
        sessionId: options.sessionId ?? null,
        signalAborted: options.signal.aborted,
        abortReason: options.signal.reason instanceof Error
          ? options.signal.reason.message
          : String(options.signal.reason ?? 'aborted'),
        networkModelCalls: 0,
      }
      await this.#onAbort?.(abortEvidence)
      this.#aborted.resolve(structuredClone(abortEvidence))

      throw options.signal.reason instanceof Error
        ? options.signal.reason
        : new Error('ActionSeam cancellation probe aborted before tool dispatch.')
    } catch (error) {
      // Promise resolver calls after an earlier resolve/reject are no-ops. This
      // therefore preserves successfully captured evidence while making every
      // validation/callback failure observable by both probe wait points.
      this.#started.reject(error)
      this.#aborted.reject(error)
      throw error
    }
  }
}

export function registerCancelTool(ctx, { onToolStart, onEffect } = {}) {
  const store = new SyntheticStateStore()
  const target = new PermissiveActionTarget()
  let toolExecutions = 0

  ctx.tools.register(defineTool({
    name: CANCEL_TOOL_NAME,
    description: 'Synthetic effect tool that must never begin during the pre-dispatch cancellation probe.',
    parameters: {
      tenant: { type: 'string', required: true },
      resource: { type: 'string', required: true },
      amount: { type: 'number', required: true },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          ok: { type: 'boolean', required: true, const: true },
          effectId: { type: 'string', required: true },
          tenant: { type: 'string', required: true },
          resource: { type: 'string', required: true },
          revision: { type: 'integer', required: true },
          value: { type: 'number', required: true },
        },
      },
      render: (_args, value) => [{ type: 'text', text: JSON.stringify(value) }],
    },
    async execute(args) {
      toolExecutions += 1
      await onToolStart?.({ toolExecutions, arguments: structuredClone(args) })

      const result = await target.invoke({
        action: {
          capability: 'synthetic.adjust-balance',
          input: structuredClone(args),
        },
        principal: { id: 'cancel-principal', tenant: 'tenant-A' },
        effectId: 'effect:actionseam-acp-cancel-v0',
        store,
      })

      const record = {
        toolExecutions,
        arguments: structuredClone(args),
        result: structuredClone(result),
        snapshot: store.snapshot(),
      }
      await onEffect?.(record)
      if (!result.ok) throw new Error(`Cancellation synthetic effect failed: ${result.code ?? 'UNKNOWN'}`)
      return structuredClone(result.value)
    },
  }))

  return {
    toolExecutions: () => toolExecutions,
    snapshot: () => store.snapshot(),
  }
}

export function summarizeCancelState({ adapter, toolState }) {
  const snapshot = toolState.snapshot()
  return {
    modelRequests: adapter.requests.length,
    modelAbortObserved: adapter.abortObserved,
    networkModelCalls: 0,
    toolExecutions: toolState.toolExecutions(),
    effectCount: snapshot.effects.length,
    attemptCount: snapshot.attempts.length,
  }
}
