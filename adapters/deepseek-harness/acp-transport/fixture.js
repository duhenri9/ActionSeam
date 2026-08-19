import { CallId, LlmAdapter } from '@deepseek-ai/dsh-llm'
import { defineTool } from '@deepseek-ai/dsh-tools'

import { PermissiveActionTarget } from '../../../src/reference/action-target.js'
import { SyntheticStateStore } from '../../../src/reference/effect-store.js'

export const PROVIDER = 'actionseam-transport-synthetic'
export const MODEL = 'deterministic-transport-v0'
export const TOOL_NAME = 'actionseam_transport_adjust'
export const USER_TEXT = 'Execute the ActionSeam ACP transport differential exactly once.'
export const FINAL_TEXT = 'actionseam-transport-complete'
export const TOOL_INPUT = Object.freeze({
  tenant: 'tenant-A',
  resource: 'transport-account-A',
  amount: 7,
})

function toolCallChunks() {
  const id = CallId('actionseam-transport-call-1')
  const argumentsJson = JSON.stringify(TOOL_INPUT)
  return [
    { type: 'block-start', index: 0, blockType: 'tool-call' },
    { type: 'tool-call-delta', index: 0, id, name: TOOL_NAME, argumentsDelta: argumentsJson },
    { type: 'block-end', index: 0, block: { type: 'tool-call', id, name: TOOL_NAME, arguments: argumentsJson } },
    { type: 'usage', usage: { inputTokens: 1, outputTokens: 1 } },
    { type: 'finish', reason: { kind: 'tool-calls' } },
  ]
}

function finalChunks() {
  return [
    { type: 'block-start', index: 0, blockType: 'text' },
    { type: 'text-delta', index: 0, text: FINAL_TEXT },
    { type: 'block-end', index: 0, block: { type: 'text', text: FINAL_TEXT } },
    { type: 'usage', usage: { inputTokens: 1, outputTokens: 1 } },
    { type: 'finish', reason: { kind: 'stop' } },
  ]
}

export class TransportAdapter extends LlmAdapter {
  requests = []

  async * stream(options) {
    this.requests.push({
      model: options.model,
      messages: structuredClone(options.messages),
      tools: structuredClone(options.tools ?? []),
    })

    if (this.requests.length === 1) {
      const serializedMessages = JSON.stringify(options.messages)
      const serializedTools = JSON.stringify(options.tools ?? [])
      if (!serializedMessages.includes(USER_TEXT)) {
        throw new Error('Transport differential input did not reach the real DSH model request.')
      }
      if (!serializedTools.includes(TOOL_NAME)) {
        throw new Error('Transport differential tool was not visible in the real DSH model request.')
      }
      for (const chunk of toolCallChunks()) yield chunk
      return
    }

    if (this.requests.length === 2) {
      for (const chunk of finalChunks()) yield chunk
      return
    }

    throw new Error(`Unexpected extra transport model request: ${this.requests.length}`)
  }
}

export function registerTransportTool(ctx, { onEffect } = {}) {
  const store = new SyntheticStateStore()
  const target = new PermissiveActionTarget()
  let toolExecutions = 0

  ctx.tools.register(defineTool({
    name: TOOL_NAME,
    description: 'ActionSeam synthetic tool used only for the ACP transport differential.',
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
      const action = {
        capability: 'synthetic.adjust-balance',
        input: structuredClone(args),
      }
      const result = await target.invoke({
        action,
        principal: { id: 'transport-principal', tenant: 'tenant-A' },
        effectId: 'effect:actionseam-acp-transport-v0',
        store,
      })
      const record = {
        toolExecutions,
        arguments: structuredClone(args),
        result: structuredClone(result),
        snapshot: store.snapshot(),
      }
      await onEffect?.(record)
      if (!result.ok) throw new Error(`Transport synthetic effect failed: ${result.code ?? 'UNKNOWN'}`)
      return structuredClone(result.value)
    },
  }))

  return {
    snapshot: () => store.snapshot(),
    toolExecutions: () => toolExecutions,
  }
}

export function normalizeEffectRecord(record) {
  const effect = record?.snapshot?.effects?.[0]
  const attempt = record?.snapshot?.attempts?.[0]
  return {
    toolExecutions: record?.toolExecutions ?? 0,
    arguments: structuredClone(record?.arguments ?? null),
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
