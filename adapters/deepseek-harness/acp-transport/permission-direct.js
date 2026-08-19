import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { Context } from '@deepseek-ai/cordis'
import * as agentSpine from '@deepseek-ai/dsh-agent-spine-demo'
import { createUserMessage } from '@deepseek-ai/dsh-llm'
import ApprovalService from '@deepseek-ai/dsh-user-approval'

import { FINAL_TEXT, MODEL, PROVIDER, TOOL_NAME, TransportAdapter, USER_TEXT, registerTransportTool } from './fixture.js'
import { expectedApprovalOutcome, normalizePermissionSnapshot, waitForServices } from './permission-common.js'

export async function runDirectPermission(decision) {
  const expected = expectedApprovalOutcome(decision)
  const oldHome = process.env.DSH_HOME
  const oldAgentsHome = process.env.DSH_AGENTS_HOME
  const home = await mkdtemp(join(tmpdir(), 'actionseam-direct-permission-'))
  const agentsHome = await mkdtemp(join(tmpdir(), 'actionseam-direct-permission-agents-'))
  const ctx = new Context()
  const requests = []
  const audit = []
  const text = []
  let handle

  process.env.DSH_HOME = home
  process.env.DSH_AGENTS_HOME = agentsHome
  try {
    await ctx.plugin(agentSpine, { workspaceContext: false, toolBash: false, toolJobs: false, goals: false, skills: { enabled: false } })
    await waitForServices(ctx, ['llm', 'sessions', 'systemPrompt', 'tools', 'agents', 'agentLoop'])
    await ctx.plugin(ApprovalService, { policy: 'ask' })
    await waitForServices(ctx, ['approval'])

    const adapter = new TransportAdapter()
    ctx.llm.registerAdapter([PROVIDER], adapter)
    const toolState = registerTransportTool(ctx)

    ctx.on('tools/pre-execute', async (exec, next) => exec.name === TOOL_NAME
      ? { kind: 'ask', reason: 'ActionSeam ACP permission differential' }
      : next())

    ctx.on('approval/request', (request) => {
      requests.push({ callId: request.callId === undefined ? null : String(request.callId), toolName: request.toolName })
      return Promise.resolve(expected)
    })

    ctx.on('session/event', (_session, event) => {
      if (event.type === 'approval/asked' || event.type === 'approval/decided') audit.push({ type: event.type, data: structuredClone(event.data) })
      if (event.type === 'assistant/message') {
        for (const block of event.data.message.content ?? []) if (block?.type === 'text' && block.text) text.push(block.text)
      }
    })

    handle = await ctx.agents.create({
      sessionId: `actionseam-direct-permission-${decision}`,
      meta: { cwd: process.cwd() },
      agentOptions: { provider: PROVIDER, model: MODEL },
    })
    handle.agent.followup(createUserMessage({ content: [{ type: 'text', text: USER_TEXT }], source: { kind: 'user' } }))
    await handle.agent.whenIdle()

    const state = normalizePermissionSnapshot(toolState.snapshot(), toolState.toolExecutions())
    const outcome = audit.find((entry) => entry.type === 'approval/decided')?.data?.outcome ?? null
    const finalText = text.at(-1) ?? ''

    if (requests.length !== 1 || outcome !== expected || finalText !== FINAL_TEXT) throw new Error(`Direct permission evidence mismatch for ${decision}`)
    if (decision === 'allow-once' && (state.toolExecutions !== 1 || state.effect === null)) throw new Error('Direct allow-once did not commit one effect')
    if (decision === 'reject-once' && (state.toolExecutions !== 0 || state.effect !== null)) throw new Error('Direct reject-once did not fail closed')

    return {
      path: 'direct-public-approval',
      requestedDecision: decision,
      approvalOutcome: outcome,
      approvalRequests: requests,
      approvalAuditTypes: audit.map((entry) => entry.type),
      modelRequests: adapter.requests.length,
      networkModelCalls: 0,
      finalText,
      ...state,
    }
  } finally {
    if (handle !== undefined) await handle.dispose()
    await ctx.fiber.dispose()
    if (oldHome === undefined) delete process.env.DSH_HOME; else process.env.DSH_HOME = oldHome
    if (oldAgentsHome === undefined) delete process.env.DSH_AGENTS_HOME; else process.env.DSH_AGENTS_HOME = oldAgentsHome
    await Promise.all([rm(home, { recursive: true, force: true }), rm(agentsHome, { recursive: true, force: true })])
  }
}
