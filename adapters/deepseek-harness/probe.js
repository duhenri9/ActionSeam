import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

import { Context } from '@deepseek-ai/cordis'
import * as agentSpine from '@deepseek-ai/dsh-agent-spine-demo'
import { LlmAdapter } from '@deepseek-ai/dsh-llm'
import { defineTool } from '@deepseek-ai/dsh-tools'

const REQUIRED_SERVICES = Object.freeze([
  'llm',
  'sessions',
  'systemPrompt',
  'tools',
  'agents',
  'invariants',
  'agentLoop',
])

class ActionSeamProbeAdapter extends LlmAdapter {
  async * stream() {
    const text = 'actionseam-probe'
    yield { type: 'block-start', index: 0, blockType: 'text' }
    yield { type: 'text-delta', index: 0, text }
    yield { type: 'block-end', index: 0, block: { type: 'text', text } }
    yield { type: 'usage', usage: { inputTokens: 0, outputTokens: 1 } }
    yield { type: 'finish', reason: { kind: 'stop' } }
  }
}

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

function actionSeamProbeTool() {
  return defineTool({
    name: 'actionseam_probe',
    description: 'ActionSeam public-surface probe tool. It performs no external effect.',
    parameters: {
      value: { type: 'string', required: true, description: 'Probe value' },
    },
    output: {
      schema: { type: 'string' },
      render: (_args, value) => [{ type: 'text', text: value }],
    },
    async execute(args) {
      return `probe:${args.value}`
    },
  })
}

export async function runProbe() {
  const previousDshHome = process.env.DSH_HOME
  const previousAgentsHome = process.env.DSH_AGENTS_HOME
  const dshHome = await mkdtemp(join(tmpdir(), 'actionseam-dsh-home-'))
  const agentsHome = await mkdtemp(join(tmpdir(), 'actionseam-dsh-agents-'))
  const ctx = new Context()

  process.env.DSH_HOME = dshHome
  process.env.DSH_AGENTS_HOME = agentsHome

  try {
    await ctx.plugin(agentSpine, {
      workspaceContext: false,
      toolBash: false,
      goals: false,
    })
    await waitForServices(ctx, REQUIRED_SERVICES)

    const adapter = new ActionSeamProbeAdapter()
    const adapterRegistration = ctx.llm.registerAdapter(['actionseam-synthetic'], adapter)
    ctx.tools.register(actionSeamProbeTool())

    const provider = ctx.llm.listProviders().find((entry) => entry.id === 'actionseam-synthetic' || entry.provider === 'actionseam-synthetic')
    const tool = ctx.tools.get('actionseam_probe')

    if (provider === undefined) {
      throw new Error('Public DSH LLM registry did not expose the ActionSeam synthetic provider after registration.')
    }
    if (tool === undefined) {
      throw new Error('Public DSH tool registry did not expose the ActionSeam probe tool after registration.')
    }

    return {
      upstream: 'deepseek-ai/deepseek-harness',
      upstreamVersion: '0.1.0-rc.7',
      upstreamCommit: '99f6f02fecdb7dff40c3fbc9470f5907c29f74ca',
      supportStatus: 'NOT_IMPLEMENTED',
      probeKind: 'public-surface-bootstrap',
      services: [...REQUIRED_SERVICES],
      llmProviderRegistered: true,
      toolRegistered: true,
      noModelNetworkCall: true,
      noToolExecution: true,
      adapterRegistrationKind: typeof adapterRegistration,
    }
  } finally {
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

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  console.log(JSON.stringify(await runProbe(), null, 2))
}
