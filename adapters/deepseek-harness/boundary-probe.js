import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { Context } from '@deepseek-ai/cordis'
import * as agentSpine from '@deepseek-ai/dsh-agent-spine-demo'
import { CallId } from '@deepseek-ai/dsh-llm'
import { defineTool } from '@deepseek-ai/dsh-tools'

const SIGNAL = new AbortController().signal

async function waitForTools(ctx, timeoutMs = 3000) {
  const started = Date.now()
  while (ctx.get('tools') === undefined) {
    if (Date.now() - started >= timeoutMs) throw new Error('DSH tools service did not become available')
    await new Promise((resolve) => setTimeout(resolve, 25))
  }
}

function summarizeResult(result) {
  return {
    isError: result.isError === true,
    errorCode: result.error?.info?.code ?? null,
    errorName: result.error?.info?.name ?? null,
    errorMessage: result.error?.message ?? null,
    content: Array.isArray(result.content)
      ? result.content.filter((block) => block?.type === 'text').map((block) => block.text).join('')
      : '',
  }
}

async function run() {
  const previousDshHome = process.env.DSH_HOME
  const previousAgentsHome = process.env.DSH_AGENTS_HOME
  const dshHome = await mkdtemp(join(tmpdir(), 'actionseam-dsh-boundary-home-'))
  const agentsHome = await mkdtemp(join(tmpdir(), 'actionseam-dsh-boundary-agents-'))
  const ctx = new Context()
  process.env.DSH_HOME = dshHome
  process.env.DSH_AGENTS_HOME = agentsHome

  let inputBodyCalls = 0
  let outputBodyCalls = 0
  let guardedBodyCalls = 0

  try {
    await ctx.plugin(agentSpine, { workspaceContext: false, toolBash: false, goals: false })
    await waitForTools(ctx)

    ctx.tools.register(defineTool({
      name: 'actionseam_input_contract',
      description: 'Reject malformed numeric input before body execution.',
      parameters: {
        amount: { type: 'number', required: true },
      },
      output: {
        schema: { type: 'string' },
        render: (_args, value) => [{ type: 'text', text: value }],
      },
      async execute(args) {
        inputBodyCalls += 1
        return String(args.amount)
      },
    }))

    const invalidInput = await ctx.tools.execute({
      callId: CallId('actionseam-invalid-input'),
      name: 'actionseam_input_contract',
      arguments: { amount: '50' },
      signal: SIGNAL,
    })

    ctx.tools.register(defineTool({
      name: 'actionseam_output_contract',
      description: 'Return a deliberately malformed value for output-schema validation.',
      parameters: {},
      output: {
        schema: {
          type: 'object',
          properties: {
            ok: { type: 'boolean' },
            revision: { type: 'integer' },
          },
          required: ['ok', 'revision'],
          additionalProperties: false,
        },
        render: (_args, value) => [{ type: 'text', text: JSON.stringify(value) }],
      },
      async execute() {
        outputBodyCalls += 1
        return { ok: true }
      },
    }))

    const invalidOutput = await ctx.tools.execute({
      callId: CallId('actionseam-invalid-output'),
      name: 'actionseam_output_contract',
      arguments: {},
      signal: SIGNAL,
    })

    ctx.tools.register(defineTool({
      name: 'actionseam_guarded',
      description: 'Probe monotonic guard behavior.',
      parameters: {},
      output: {
        schema: { type: 'string' },
        render: (_args, value) => [{ type: 'text', text: value }],
      },
      async execute() {
        guardedBodyCalls += 1
        return 'should-not-run'
      },
    }))

    ctx.on('tools/pre-execute', async (exec, next) => {
      if (exec.name !== 'actionseam_guarded') return next()
      return { kind: 'allow' }
    })
    ctx.tools.guard((exec) => exec.name === 'actionseam_guarded' ? 'ActionSeam monotonic deny probe' : undefined)

    const guarded = await ctx.tools.execute({
      callId: CallId('actionseam-guarded'),
      name: 'actionseam_guarded',
      arguments: {},
      signal: SIGNAL,
    })

    const result = {
      upstreamVersion: '0.1.0-rc.7',
      supportStatus: 'NOT_IMPLEMENTED',
      inputValidation: {
        ...summarizeResult(invalidInput),
        bodyCalls: inputBodyCalls,
      },
      outputValidation: {
        ...summarizeResult(invalidOutput),
        bodyCalls: outputBodyCalls,
      },
      monotonicGuard: {
        ...summarizeResult(guarded),
        bodyCalls: guardedBodyCalls,
        preExecuteDecision: 'allow',
        guardDecision: 'deny',
      },
    }

    assert.equal(result.inputValidation.isError, true)
    assert.equal(result.inputValidation.bodyCalls, 0)
    assert.equal(result.outputValidation.isError, true)
    assert.equal(result.outputValidation.bodyCalls, 1)
    assert.equal(result.monotonicGuard.isError, true)
    assert.equal(result.monotonicGuard.bodyCalls, 0)

    return result
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

console.log(JSON.stringify(await run(), null, 2))
