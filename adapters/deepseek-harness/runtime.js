import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { Context } from '@deepseek-ai/cordis'
import * as agentSpine from '@deepseek-ai/dsh-agent-spine-demo'
import { CallId, LlmAdapter, createUserMessage } from '@deepseek-ai/dsh-llm'
import { defineTool } from '@deepseek-ai/dsh-tools'

import { digest } from '../../src/core/digest.js'
import { EvidenceLog } from '../../src/core/evidence.js'

const PROVIDER = 'actionseam-synthetic'
const MODEL = 'deterministic-v0'
const TOOL_NAME = 'actionseam_adjust_balance'

function modelVisibleInputs(entries = []) {
  return entries
    .filter((entry) => entry.visibility === 'model')
    .map((entry) => ({ kind: entry.kind, value: entry.value }))
}

function reducePolicy(decisions = []) {
  if (decisions.includes('deny')) return 'deny'
  if (decisions.includes('approval')) return 'approval'
  return 'allow'
}

function toolDescriptor(actionTarget) {
  return {
    capability: 'synthetic.adjust-balance',
    actionTarget: actionTarget.metadata,
    contract: {
      input: ['tenant:string', 'resource:string', 'amount:number', 'expectedRevision?:integer'],
      output: ['ok:true', 'effectId:string', 'revision:integer', 'value:number'],
    },
  }
}

function toolCallChunks(input) {
  const id = CallId('actionseam-profile-call-1')
  const argumentsJson = JSON.stringify(input)
  return [
    { type: 'block-start', index: 0, blockType: 'tool-call' },
    {
      type: 'tool-call-delta',
      index: 0,
      id,
      name: TOOL_NAME,
      argumentsDelta: argumentsJson,
    },
    {
      type: 'block-end',
      index: 0,
      block: { type: 'tool-call', id, name: TOOL_NAME, arguments: argumentsJson },
    },
    { type: 'usage', usage: { inputTokens: 1, outputTokens: 1 } },
    { type: 'finish', reason: { kind: 'tool-calls' } },
  ]
}

function finalChunks() {
  const text = 'actionseam-profile-complete'
  return [
    { type: 'block-start', index: 0, blockType: 'text' },
    { type: 'text-delta', index: 0, text },
    { type: 'block-end', index: 0, block: { type: 'text', text } },
    { type: 'usage', usage: { inputTokens: 1, outputTokens: 1 } },
    { type: 'finish', reason: { kind: 'stop' } },
  ]
}

class ScenarioAdapter extends LlmAdapter {
  requests = []

  constructor({ input }) {
    super()
    this.input = structuredClone(input)
  }

  async * stream(options) {
    this.requests.push({
      model: options.model,
      system: options.system,
      messages: structuredClone(options.messages),
      tools: structuredClone(options.tools ?? []),
    })
    const chunks = this.requests.length === 1 ? toolCallChunks(this.input) : finalChunks()
    for (const chunk of chunks) yield chunk
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

function normalizeToolResult(result) {
  if (result === undefined) return null
  if (result.isError === true) {
    return {
      isError: true,
      errorCode: result.error?.info?.code ?? null,
      errorName: result.error?.info?.name ?? null,
      errorMessage: result.error?.message ?? null,
    }
  }
  return {
    isError: false,
    value: structuredClone(result.value),
  }
}

function dshToolDefinition({ actionTarget, descriptor, principal, scenario, store, state }) {
  return defineTool({
    name: TOOL_NAME,
    description: `ActionSeam synthetic effect descriptor: ${JSON.stringify(descriptor)}`,
    parameters: {
      tenant: { type: 'string', required: true },
      resource: { type: 'string', required: true },
      amount: { type: 'number', required: true },
      expectedRevision: { type: 'integer' },
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
      state.toolBodyCalls += 1
      const action = {
        capability: 'synthetic.adjust-balance',
        input: structuredClone(args),
      }
      const effectId = `effect:dsh:${digest({ scenarioId: scenario.id, action, principal })}`
      const result = await actionTarget.invoke({
        action,
        principal,
        effectId,
        store,
        fault: scenario.fault,
      })
      state.actionTargetResult = structuredClone(result)
      state.effectId = effectId
      if (!result.ok) {
        const error = new Error(`ActionTarget failed: ${result.code ?? 'UNKNOWN'}`)
        error.code = result.code ?? 'ACTION_TARGET_FAILED'
        throw error
      }
      return structuredClone(result.value)
    },
  })
}

function requestContainsMaterial(request, visibleInputs, descriptor) {
  if (!request) return false
  const messages = JSON.stringify(request.messages)
  const tools = JSON.stringify(request.tools)
  const inputsPresent = visibleInputs.every((entry) =>
    messages.includes(`ACTIONSEAM_MODEL_INPUT ${JSON.stringify(entry)}`),
  )
  return inputsPresent && tools.includes(JSON.stringify(descriptor))
}

function mapResult({ state, policyDecision }) {
  if (state.guardDenied) {
    return { outcome: 'DENIED', result: null }
  }

  const upstream = state.toolResult
  if (upstream?.isError === true) {
    if (upstream.errorCode === 'INVALID_ARGS') {
      return {
        outcome: 'ACTION_FAILED',
        result: { ok: false, code: 'INPUT_INVALID', upstreamCode: upstream.errorCode, stage: 'dsh-input-validation' },
      }
    }
    if (upstream.errorCode === 'INVALID_TOOL_OUTPUT') {
      return {
        outcome: 'ACTION_FAILED',
        result: { ok: false, code: 'OUTPUT_INVALID', upstreamCode: upstream.errorCode, stage: 'dsh-output-validation' },
      }
    }
    return {
      outcome: policyDecision === 'deny' ? 'DENIED' : 'ACTION_FAILED',
      result: { ok: false, code: upstream.errorCode ?? 'DSH_TOOL_FAILED', stage: 'dsh-tool-runtime' },
    }
  }

  if (state.actionTargetResult) {
    return {
      outcome: state.actionTargetResult.ok ? 'COMPLETED' : 'ACTION_FAILED',
      result: structuredClone(state.actionTargetResult),
    }
  }

  return { outcome: policyDecision === 'deny' ? 'DENIED' : 'ACTION_FAILED', result: null }
}

export class DeepSeekHarnessRuntime {
  metadata = Object.freeze({
    id: 'deepseek-harness.agent-loop',
    version: '0.1.0-rc.7',
    adapter: 'actionseam.deepseek-harness-runtime',
    adapterVersion: '0.1.0-experimental',
    upstreamCommit: '99f6f02fecdb7dff40c3fbc9470f5907c29f74ca',
    mode: 'agent-spine-direct',
  })

  async execute({ scenario, actionTarget, store }) {
    const evidence = new EvidenceLog()
    const principal = structuredClone(scenario.trustedPrincipal)
    const visibleInputs = modelVisibleInputs(scenario.context)
    const descriptor = toolDescriptor(actionTarget)
    const policyDecision = reducePolicy(scenario.policy)
    const previousDshHome = process.env.DSH_HOME
    const previousAgentsHome = process.env.DSH_AGENTS_HOME
    const dshHome = await mkdtemp(join(tmpdir(), 'actionseam-dsh-runtime-home-'))
    const agentsHome = await mkdtemp(join(tmpdir(), 'actionseam-dsh-runtime-agents-'))
    const ctx = new Context()
    let handle

    process.env.DSH_HOME = dshHome
    process.env.DSH_AGENTS_HOME = agentsHome

    const state = {
      actionTargetResult: null,
      effectId: null,
      guardDenied: false,
      preExecuteAttemptedAllow: false,
      toolBodyCalls: 0,
      toolResult: null,
      durableEventTypes: [],
    }

    try {
      await ctx.plugin(agentSpine, {
        workspaceContext: false,
        toolBash: false,
        goals: false,
        invariants: {
          enabled: true,
          package_allowlist: ['^@deepseek-ai/dsh-agent-loop$'],
        },
      })
      await waitForServices(ctx, ['llm', 'sessions', 'systemPrompt', 'tools', 'agents', 'invariants', 'agentLoop'])

      const adapter = new ScenarioAdapter({ input: scenario.action.input })
      ctx.llm.registerAdapter([PROVIDER], adapter)
      ctx.tools.register(dshToolDefinition({ actionTarget, descriptor, principal, scenario, store, state }))

      const untrustedOverride = (scenario.context ?? [])
        .filter((entry) => entry.kind === 'retrieved-text' && entry.visibility === 'model')
        .some((entry) => String(entry.value).includes('ACTIONSEAM_OVERRIDE_ALLOW'))
      const laterAllow = (scenario.policy ?? []).at(-1) === 'allow'

      ctx.on('tools/pre-execute', async (exec, next) => {
        if (exec.name !== TOOL_NAME) return next()
        evidence.append('dsh.tools.pre-execute', { arguments: structuredClone(exec.arguments) })
        if (laterAllow || untrustedOverride) {
          state.preExecuteAttemptedAllow = true
          evidence.append('dsh.tools.pre-execute.decision', {
            decision: 'allow',
            reason: laterAllow ? 'later-policy-allow' : 'untrusted-context-override-attempt',
          })
          return { kind: 'allow' }
        }
        return next()
      })

      ctx.tools.guard((exec) => {
        if (exec.name !== TOOL_NAME || policyDecision !== 'deny') return undefined
        state.guardDenied = true
        evidence.append('dsh.tools.guard', { decision: 'deny', reason: 'ActionSeam binding deny' })
        return 'ActionSeam binding deny'
      })

      ctx.on('tools/result', (exec, result) => {
        if (exec.name !== TOOL_NAME) return
        state.toolResult = normalizeToolResult(result)
        evidence.append('dsh.tools.result', structuredClone(state.toolResult))
      })

      ctx.on('session/event', (_session, event) => {
        if ([
          'request/header',
          'turn/start',
          'step/start',
          'assistant/message',
          'tool/call',
          'tool/result',
          'step/end',
          'turn/end',
        ].includes(event.type)) {
          state.durableEventTypes.push(event.type)
        }
      })

      evidence.append('identity.established', { principal, source: 'actionseam-trusted-runtime-context' })
      evidence.append('action.proposed', { actionDigest: digest(scenario.action), action: structuredClone(scenario.action) })
      evidence.append('authority.policy', { inputs: [...(scenario.policy ?? [])], decision: policyDecision })

      const promptParts = visibleInputs.map((entry) => `ACTIONSEAM_MODEL_INPUT ${JSON.stringify(entry)}`)
      promptParts.push('Execute the ActionSeam synthetic balance action exactly once using the visible tool.')

      handle = await ctx.agents.create({
        sessionId: `actionseam-${scenario.id}`,
        meta: { cwd: process.cwd() },
        agentOptions: { provider: PROVIDER, model: MODEL },
      })
      handle.agent.followup(createUserMessage({
        content: promptParts.map((text) => ({ type: 'text', text })),
        source: { kind: 'user' },
      }))
      await handle.agent.whenIdle()

      const materialVerified = requestContainsMaterial(adapter.requests[0], visibleInputs, descriptor)
      evidence.append('dsh.request.material-verified', {
        verified: materialVerified,
        requestCount: adapter.requests.length,
        agentLoopInvariantAllowlist: ['@deepseek-ai/dsh-agent-loop'],
      })

      if (materialVerified) {
        for (const entry of visibleInputs) {
          evidence.append('model.input.admitted', { digest: digest(entry), entry })
        }
        evidence.append('model.tool.admitted', { digest: digest(descriptor), descriptor })
        const requestManifest = { inputs: visibleInputs, tool: descriptor }
        evidence.append('model.request', { manifestDigest: digest(requestManifest) })
      }

      evidence.append('dsh.session.events', { types: [...state.durableEventTypes] })
      if (state.actionTargetResult) {
        evidence.append('action.attempt', {
          effectId: state.effectId,
          result: structuredClone(state.actionTargetResult),
          attempt: 1,
          dispatch: 'dsh-agent-loop-tool-pipeline',
        })
      }

      const mapped = mapResult({ state, policyDecision })
      evidence.append('action.terminal', {
        outcome: mapped.outcome,
        result: structuredClone(mapped.result),
        dsh: {
          toolBodyCalls: state.toolBodyCalls,
          preExecuteAttemptedAllow: state.preExecuteAttemptedAllow,
          guardDenied: state.guardDenied,
        },
      })

      return {
        outcome: mapped.outcome,
        principal,
        result: mapped.result,
        evidence: evidence.all(),
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
}
