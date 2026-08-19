import { writeFile } from 'node:fs/promises'

import { Context } from '@deepseek-ai/cordis'
import * as AcpPlugin from '@deepseek-ai/dsh-acp'
import * as agentSpine from '@deepseek-ai/dsh-agent-spine-demo'

import {
  MODEL,
  PROVIDER,
  TransportAdapter,
  normalizeEffectRecord,
  registerTransportTool,
} from './fixture.js'

async function waitForServices(ctx, names, timeoutMs = 3000) {
  const started = Date.now()
  for (;;) {
    const missing = names.filter((name) => ctx.get(name) === undefined)
    if (missing.length === 0) return
    if (Date.now() - started >= timeoutMs) throw new Error(`ACP server missing services: ${missing.join(', ')}`)
    await new Promise((resolve) => setTimeout(resolve, 25))
  }
}

const effectPath = process.env.ACTIONSEAM_ACP_EFFECT_PATH
if (!effectPath) throw new Error('ACTIONSEAM_ACP_EFFECT_PATH is required.')

const previousDshHome = process.env.DSH_HOME
const previousAgentsHome = process.env.DSH_AGENTS_HOME
const ctx = new Context()
let shutdownResolve
const shutdown = new Promise((resolve) => { shutdownResolve = resolve })

async function disposeAndExit(code = 0) {
  try {
    await ctx.fiber.dispose()
  } catch (error) {
    console.error(error)
    code = 1
  }
  if (previousDshHome === undefined) delete process.env.DSH_HOME
  else process.env.DSH_HOME = previousDshHome
  if (previousAgentsHome === undefined) delete process.env.DSH_AGENTS_HOME
  else process.env.DSH_AGENTS_HOME = previousAgentsHome
  process.exitCode = code
}

process.once('SIGTERM', () => shutdownResolve())
process.once('SIGINT', () => shutdownResolve())

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
  registerTransportTool(ctx, {
    async onEffect(record) {
      const evidence = {
        inputAccepted: true,
        modelRequestsAtEffect: adapter.requests.length,
        networkModelCalls: 0,
        effect: normalizeEffectRecord(record),
      }
      await writeFile(effectPath, `${JSON.stringify(evidence, null, 2)}\n`, 'utf8')
    },
  })

  await ctx.plugin(AcpPlugin, { provider: PROVIDER, model: MODEL })
  await shutdown
  await disposeAndExit(0)
} catch (error) {
  console.error(error)
  await disposeAndExit(1)
}
