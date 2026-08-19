import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { Context } from '@deepseek-ai/cordis'
import * as agentSpine from '@deepseek-ai/dsh-agent-spine-demo'
import { createUserMessage } from '@deepseek-ai/dsh-llm'

import {
  CANCEL_MODEL,
  CANCEL_PROVIDER,
  CANCEL_USER_TEXT,
  PreDispatchCancelAdapter,
  registerCancelTool,
  summarizeCancelState,
} from './cancel-common.js'

async function waitForServices(ctx, names, timeoutMs = 3000) {
  const started = Date.now()
  for (;;) {
    const missing = names.filter((name) => ctx.get(name) === undefined)
    if (missing.length === 0) return
    if (Date.now() - started >= timeoutMs) throw new Error(`Direct cancellation probe missing services: ${missing.join(', ')}`)
    await new Promise((resolve) => setTimeout(resolve, 25))
  }
}

export async function runDirectCancellation() {
  const previousDshHome = process.env.DSH_HOME
  const previousAgentsHome = process.env.DSH_AGENTS_HOME
  const dshHome = await mkdtemp(join(tmpdir(), 'actionseam-cancel-direct-home-'))
  const agentsHome = await mkdtemp(join(tmpdir(), 'actionseam-cancel-direct-agents-'))
  const ctx = new Context()
  let handle
  const turnEndReasons = []

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

    const adapter = new PreDispatchCancelAdapter()
    ctx.llm.registerAdapter([CANCEL_PROVIDER], adapter)
    const toolState = registerCancelTool(ctx)

    ctx.on('session/event', (_session, event) => {
      if (event.type === 'turn/end') turnEndReasons.push(structuredClone(event.data.reason))
    })

    handle = await ctx.agents.create({
      sessionId: 'actionseam-cancel-direct',
      meta: { cwd: process.cwd() },
      agentOptions: { provider: CANCEL_PROVIDER, model: CANCEL_MODEL },
    })

    handle.agent.followup(createUserMessage({
      content: [{ type: 'text', text: CANCEL_USER_TEXT }],
      source: { kind: 'user' },
    }))

    const modelStart = await adapter.whenStarted()
    if (modelStart.signalAbortedAtStart) throw new Error('Direct cancellation probe model was already aborted before the test cancellation.')
    if (toolState.toolExecutions() !== 0) throw new Error('Direct cancellation probe dispatched a tool before cancellation.')

    handle.agent.cancel({ kind: 'user' })
    const modelAbort = await adapter.whenAborted()
    await handle.agent.whenIdle()

    const state = summarizeCancelState({ adapter, toolState })
    if (!state.modelAbortObserved) throw new Error('Direct cancellation probe did not observe the LLM AbortSignal.')
    if (state.toolExecutions !== 0) throw new Error(`Direct cancellation probe executed ${state.toolExecutions} tool(s).`)
    if (state.effectCount !== 0 || state.attemptCount !== 0) {
      throw new Error(`Direct cancellation probe mutated synthetic state: ${JSON.stringify(state)}`)
    }

    return {
      path: 'direct-agent-cancel',
      cancelIssued: true,
      modelStart,
      modelAbort,
      state,
      turnEndReasons,
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
