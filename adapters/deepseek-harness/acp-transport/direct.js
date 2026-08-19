import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { Context } from '@deepseek-ai/cordis'
import * as agentSpine from '@deepseek-ai/dsh-agent-spine-demo'
import { createUserMessage } from '@deepseek-ai/dsh-llm'

import {
  FINAL_TEXT,
  MODEL,
  PROVIDER,
  TransportAdapter,
  USER_TEXT,
  normalizeEffectRecord,
  registerTransportTool,
} from './fixture.js'

async function waitForServices(ctx, names, timeoutMs = 3000) {
  const started = Date.now()
  for (;;) {
    const missing = names.filter((name) => ctx.get(name) === undefined)
    if (missing.length === 0) return
    if (Date.now() - started >= timeoutMs) throw new Error(`Direct transport baseline missing services: ${missing.join(', ')}`)
    await new Promise((resolve) => setTimeout(resolve, 25))
  }
}

export async function runDirectBaseline() {
  const previousDshHome = process.env.DSH_HOME
  const previousAgentsHome = process.env.DSH_AGENTS_HOME
  const dshHome = await mkdtemp(join(tmpdir(), 'actionseam-transport-direct-home-'))
  const agentsHome = await mkdtemp(join(tmpdir(), 'actionseam-transport-direct-agents-'))
  const ctx = new Context()
  let handle
  let effectRecord = null
  const committedText = []

  process.env.DSH_HOME = dshHome
  process.env.DSH_AGENTS_HOME = agentsHome

  try {
    await ctx.plugin(agentSpine, {
      workspaceContext: false,
      toolBash: false,
      toolJobs: false,
      goals: false,
      skills: { enabled: false },
    })
    await waitForServices(ctx, ['llm', 'sessions', 'systemPrompt', 'tools', 'agents', 'agentLoop'])

    const adapter = new TransportAdapter()
    ctx.llm.registerAdapter([PROVIDER], adapter)
    const toolState = registerTransportTool(ctx, {
      onEffect(record) {
        effectRecord = structuredClone(record)
      },
    })

    ctx.on('session/event', (_session, event) => {
      if (event.type !== 'assistant/message') return
      for (const block of event.data.message.content ?? []) {
        if (block?.type === 'text' && typeof block.text === 'string' && block.text.length > 0) {
          committedText.push(block.text)
        }
      }
    })

    handle = await ctx.agents.create({
      sessionId: 'actionseam-transport-direct',
      meta: { cwd: process.cwd() },
      agentOptions: { provider: PROVIDER, model: MODEL },
    })
    handle.agent.followup(createUserMessage({
      content: [{ type: 'text', text: USER_TEXT }],
      source: { kind: 'user' },
    }))
    await handle.agent.whenIdle()

    const finalText = committedText.at(-1) ?? ''
    if (finalText !== FINAL_TEXT) throw new Error(`Direct baseline final text mismatch: ${finalText}`)
    if (adapter.requests.length !== 2) throw new Error(`Direct baseline expected two model requests, got ${adapter.requests.length}`)
    if (toolState.toolExecutions() !== 1) throw new Error(`Direct baseline expected one tool execution, got ${toolState.toolExecutions()}`)
    if (effectRecord === null) throw new Error('Direct baseline did not produce a synthetic effect record.')

    return {
      path: 'direct-agent-loop',
      inputAccepted: true,
      modelRequests: adapter.requests.length,
      networkModelCalls: 0,
      finalText,
      effect: normalizeEffectRecord(effectRecord),
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
