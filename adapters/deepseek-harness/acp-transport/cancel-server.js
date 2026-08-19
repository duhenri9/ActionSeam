import { rename, writeFile } from 'node:fs/promises'

import { Context } from '@deepseek-ai/cordis'
import * as AcpPlugin from '@deepseek-ai/dsh-acp'
import * as agentSpine from '@deepseek-ai/dsh-agent-spine-demo'

import {
  CANCEL_MODEL,
  CANCEL_PROVIDER,
  PreDispatchCancelAdapter,
  registerCancelTool,
} from './cancel-common.js'

async function waitForServices(ctx, names, timeoutMs = 3000) {
  const started = Date.now()
  for (;;) {
    const missing = names.filter((name) => ctx.get(name) === undefined)
    if (missing.length === 0) return
    if (Date.now() - started >= timeoutMs) throw new Error(`ACP cancellation server missing services: ${missing.join(', ')}`)
    await new Promise((resolve) => setTimeout(resolve, 25))
  }
}

async function writeEvidence(path, evidence) {
  const staging = `${path}.partial`
  await writeFile(staging, `${JSON.stringify(evidence, null, 2)}\n`, 'utf8')
  await rename(staging, path)
}

const startPath = process.env.ACTIONSEAM_ACP_CANCEL_START_PATH
const abortPath = process.env.ACTIONSEAM_ACP_CANCEL_ABORT_PATH
const toolStartPath = process.env.ACTIONSEAM_ACP_CANCEL_TOOL_START_PATH
const effectPath = process.env.ACTIONSEAM_ACP_CANCEL_EFFECT_PATH
for (const [name, value] of Object.entries({ startPath, abortPath, toolStartPath, effectPath })) {
  if (!value) throw new Error(`${name} is required.`)
}

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

  const adapter = new PreDispatchCancelAdapter({
    async onStart(evidence) {
      await writeEvidence(startPath, evidence)
    },
    async onAbort(evidence) {
      await writeEvidence(abortPath, evidence)
    },
  })
  ctx.llm.registerAdapter([CANCEL_PROVIDER], adapter)

  registerCancelTool(ctx, {
    async onToolStart(evidence) {
      await writeEvidence(toolStartPath, evidence)
    },
    async onEffect(evidence) {
      await writeEvidence(effectPath, evidence)
    },
  })

  await ctx.plugin(AcpPlugin, { provider: CANCEL_PROVIDER, model: CANCEL_MODEL })
  await shutdown
  await disposeAndExit(0)
} catch (error) {
  console.error(error)
  await disposeAndExit(1)
}
