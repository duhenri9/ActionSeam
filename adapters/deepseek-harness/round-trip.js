import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { Context } from '@deepseek-ai/cordis'
import * as agentSpine from '@deepseek-ai/dsh-agent-spine-demo'
import { CallId, LlmAdapter, createUserMessage } from '@deepseek-ai/dsh-llm'
import { defineTool } from '@deepseek-ai/dsh-tools'

const PROVIDER = 'actionseam-synthetic'
const MODEL = 'deterministic-v0'
const TOOL = 'actionseam_probe'
const SESSION_ID = 'actionseam-round-trip'
const FINAL_TEXT = 'actionseam-round-trip-complete'

const REQUIRED_SERVICES = Object.freeze([
  'llm',
  'sessions',
  'systemPrompt',
  'tools',
  'agents',
  'invariants',
  'agentLoop',
])

async function waitForServices(ctx, names, timeoutMs = 3000) {
  const started = Date.now()
  for (;;) {
    const missing = names.filter((name) => ctx.get(name) === undefined)
    if (missing.length === 0) return
    if (Date.now() - started >= timeoutMs) {
      throw new Error(`DeepSeek Harness spine did not expose services: ${missing.join(', ')}`)
    }
    await new Promise((resolve) => setTimeout(resolve, 25))
  }
}

function textChunks(text) {
  return [
    { type: 'block-start', index: 0, blockType: 'text' },
    { type: 'text-delta', index: 0, text },
    { type: 'block-end', index: 0, block: { type: 'text', text } },
    { type: 'usage', usage: { inputTokens: 1, outputTokens: 1 } },
    { type: 'finish', reason: { kind: 'stop' } },
  ]
}

function toolCallChunks() {
  const id = CallId('actionseam-call-1')
  const argumentsJson = JSON.stringify({ value: 'round-trip' })
  return [
    { type: 'block-start', index: 0, blockType: 'tool-call' },
    {
      type: 'tool-call-delta',
      index: 0,
      id,
      name: TOOL,
      argumentsDelta: argumentsJson,
    },
    {
      type: 'block-end',
      index: 0,
      block: { type: 'tool-call', id, name: TOOL, arguments: argumentsJson },
    },
    { type: 'usage', usage: { inputTokens: 1, outputTokens: 1 } },
    { type: 'finish', reason: { kind: 'tool-calls' } },
  ]
}

class ActionSeamRoundTripAdapter extends LlmAdapter {
  requests = 0

  async * stream(options) {
    this.requests += 1
    const chunks = this.requests === 1 ? toolCallChunks() : textChunks(FINAL_TEXT)
    for (const chunk of chunks) {
      if (options.signal?.aborted) throw new Error('ActionSeam synthetic adapter aborted')
      yield chunk
    }
  }
}

function contentText(content) {
  if (!Array.isArray(content)) return ''
  return content
    .filter((block) => block?.type === 'text')
    .map((block) => block.text)
    .join('')
}

async function run() {
  const previousDshHome = process.env.DSH_HOME
  const previousAgentsHome = process.env.DSH_AGENTS_HOME
  const dshHome = await mkdtemp(join(tmpdir(), 'actionseam-dsh-roundtrip-home-'))
  const agentsHome = await mkdtemp(join(tmpdir(), 'actionseam-dsh-roundtrip-agents-'))
  const ctx = new Context()
  let handle

  process.env.DSH_HOME = dshHome
  process.env.DSH_AGENTS_HOME = agentsHome

  const pipeline = []
  const durableEventTypes = []
  const toolState = { executions: 0, values: [] }

  try {
    await ctx.plugin(agentSpine, {
      workspaceContext: false,
      toolBash: false,
      goals: false,
    })
    await waitForServices(ctx, REQUIRED_SERVICES)

    const adapter = new ActionSeamRoundTripAdapter()
    ctx.llm.registerAdapter([PROVIDER], adapter)

    ctx.tools.register(defineTool({
      name: TOOL,
      description: 'Deterministic ActionSeam round-trip tool with no external side effect.',
      parameters: {
        value: { type: 'string', required: true, description: 'Deterministic probe value' },
      },
      output: {
        schema: { type: 'string' },
        render: (_args, value) => [{ type: 'text', text: value }],
      },
      async execute(args) {
        toolState.executions += 1
        toolState.values.push(args.value)
        return `probe:${args.value}`
      },
    }))

    ctx.on('tools/pre-execute', async (exec, next) => {
      if (exec.name === TOOL) {
        pipeline.push({
          stage: 'tools/pre-execute',
          tool: exec.name,
          arguments: structuredClone(exec.arguments),
        })
      }
      return next()
    })

    ctx.on('tools/result', (exec, result) => {
      if (exec.name === TOOL) {
        pipeline.push({
          stage: 'tools/result',
          tool: exec.name,
          isError: result.isError === true,
          text: contentText(result.content),
        })
      }
    })

    ctx.on('session/event', (_session, event) => {
      if ([
        'turn/start',
        'step/start',
        'tool/call',
        'tool/result',
        'assistant/message',
        'step/end',
        'turn/end',
      ].includes(event.type)) {
        durableEventTypes.push(event.type)
      }
    })

    handle = await ctx.agents.create({
      sessionId: SESSION_ID,
      meta: { cwd: process.cwd() },
      agentOptions: { provider: PROVIDER, model: MODEL },
    })

    handle.agent.followup(createUserMessage({
      content: [{ type: 'text', text: 'Run the deterministic ActionSeam round-trip tool once.' }],
      source: { kind: 'user' },
    }))
    await handle.agent.whenIdle()

    const derived = handle.agent.session.deriveMessages()
    const finalText = derived
      .flatMap((message) => message.content ?? [])
      .filter((block) => block?.type === 'text')
      .map((block) => block.text)
      .at(-1)

    assert.equal(adapter.requests, 2, 'one tool-call model response and one final model response are expected')
    assert.equal(toolState.executions, 1, 'the tool body must execute exactly once')
    assert.deepEqual(toolState.values, ['round-trip'])
    assert.deepEqual(pipeline.map((entry) => entry.stage), ['tools/pre-execute', 'tools/result'])
    assert.equal(pipeline[1]?.isError, false)
    assert.equal(pipeline[1]?.text, 'probe:round-trip')
    assert.ok(durableEventTypes.includes('tool/call'), 'durable tool/call evidence is required')
    assert.ok(durableEventTypes.includes('tool/result'), 'durable tool/result evidence is required')
    assert.ok(durableEventTypes.includes('turn/start'), 'durable turn/start evidence is required')
    assert.ok(durableEventTypes.includes('turn/end'), 'durable turn/end evidence is required')
    assert.equal(finalText, FINAL_TEXT)

    return {
      upstream: 'deepseek-ai/deepseek-harness',
      upstreamVersion: '0.1.0-rc.7',
      upstreamCommit: '99f6f02fecdb7dff40c3fbc9470f5907c29f74ca',
      evidenceKind: 'real-agent-loop-tool-round-trip',
      supportStatus: 'NOT_IMPLEMENTED',
      provider: PROVIDER,
      model: MODEL,
      llmRequests: adapter.requests,
      toolExecutions: toolState.executions,
      pipeline,
      durableEventTypes,
      finalText,
      networkModelCalls: 0,
    }
  } finally {
    if (handle !== undefined) await handle.dispose()
    await ctx.fiber.dispose()
    if (previousDshHome === undefined) delete process.env.DSH_HOME
    else process.env.DSH_HOME = previousDshHome
    if (previousAgentsHome === undefined) delete process.env.DSH_AGENTS_HOME
    else process.env.DSH_AGENTS_HOME = previousAgentsHome
    await Promise.all([
      rm(dshHome, { recursive: true, force: true }),
      rm(agentsHome, { recursive: true, force: true }),
    ])
  }
}

console.log(JSON.stringify(await run(), null, 2))
