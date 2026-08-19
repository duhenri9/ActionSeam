import { writeFile } from 'node:fs/promises'

import { Context } from '@deepseek-ai/cordis'
import * as AcpPlugin from '@deepseek-ai/dsh-acp'
import * as agentSpine from '@deepseek-ai/dsh-agent-spine-demo'
import ApprovalService from '@deepseek-ai/dsh-user-approval'

import { MODEL, PROVIDER, TOOL_NAME, TransportAdapter, registerTransportTool } from './fixture.js'
import { normalizePermissionSnapshot, waitForServices } from './permission-common.js'

const statePath = process.env.ACTIONSEAM_ACP_PERMISSION_STATE_PATH
if (!statePath) throw new Error('ACTIONSEAM_ACP_PERMISSION_STATE_PATH is required')

const ctx = new Context()
const approvalAudit = []
let toolState
let toolResult = null
let shutdownResolve
const shutdown = new Promise((resolve) => { shutdownResolve = resolve })

async function persist() {
  if (!toolState) return
  const decided = approvalAudit.find((entry) => entry.type === 'approval/decided')?.data?.outcome ?? null
  const body = {
    approvalOutcome: decided,
    approvalAudit,
    toolResult,
    ...normalizePermissionSnapshot(toolState.snapshot(), toolState.toolExecutions()),
  }
  await writeFile(statePath, `${JSON.stringify(body, null, 2)}\n`, 'utf8')
}

process.once('SIGTERM', () => shutdownResolve())
process.once('SIGINT', () => shutdownResolve())

try {
  await ctx.plugin(agentSpine, { workspaceContext: false, toolBash: false, toolJobs: false, goals: false, skills: { enabled: false } })
  await waitForServices(ctx, ['llm', 'sessions', 'systemPrompt', 'tools', 'agents', 'agentLoop'])
  await ctx.plugin(ApprovalService, { policy: 'ask' })
  await waitForServices(ctx, ['approval'])

  const adapter = new TransportAdapter()
  ctx.llm.registerAdapter([PROVIDER], adapter)
  toolState = registerTransportTool(ctx)

  ctx.on('tools/pre-execute', async (exec, next) => exec.name === TOOL_NAME
    ? { kind: 'ask', reason: 'ActionSeam ACP permission differential' }
    : next())

  ctx.on('session/event', (_session, event) => {
    if (event.type !== 'approval/asked' && event.type !== 'approval/decided') return
    approvalAudit.push({ type: event.type, data: structuredClone(event.data) })
    void persist()
  })

  ctx.on('tools/result', (exec, result) => {
    if (exec.name !== TOOL_NAME) return
    toolResult = {
      isError: result.isError === true,
      errorCode: result.error?.info?.code ?? null,
      errorMessage: result.error?.message ?? null,
    }
    void persist()
  })

  await ctx.plugin(AcpPlugin, { provider: PROVIDER, model: MODEL })
  await shutdown
  await ctx.fiber.dispose()
} catch (error) {
  console.error(error)
  try { await ctx.fiber.dispose() } catch {}
  process.exitCode = 1
}
