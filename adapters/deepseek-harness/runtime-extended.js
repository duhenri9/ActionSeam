import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { Context } from '@deepseek-ai/cordis'
import * as agentSpine from '@deepseek-ai/dsh-agent-spine-demo'
import { CallId, LlmAdapter } from '@deepseek-ai/dsh-llm'
import { defineTool } from '@deepseek-ai/dsh-tools'
import ApprovalService from '@deepseek-ai/dsh-user-approval'

import { digest } from '../../src/core/digest.js'
import { EvidenceLog } from '../../src/core/evidence.js'
import { DeepSeekHarnessRuntime } from './runtime.js'

const PROVIDER = 'actionseam-noop-profile-provider'
const MODEL = 'no-network-v0'
const TOOL_NAME = 'actionseam_adjust_balance'
const APPROVAL_SCENARIO = 'approval-one-shot-second-call'
const IMMUTABILITY_SCENARIO = 'runtime-argument-rewrite-attempt'

class NoopAdapter extends LlmAdapter {
  async * stream() {
    throw new Error('The direct ToolRuntime profile harness must not invoke the model adapter.')
  }
}

async function waitForServices(ctx, names, timeoutMs = 3000) {
  const started = Date.now()
  for (;;) {
    const missing = names.filter((name) => ctx.get(name) === undefined)
    if (missing.length === 0) return
    if (Date.now() - started >= timeoutMs) {
      throw new Error(`DeepSeek Harness profile harness did not expose services: ${missing.join(', ')}`)
    }
    await new Promise((resolve) => setTimeout(resolve, 25))
  }
}

function materialAction(base, patch = {}) {
  return {
    ...structuredClone(base),
    input: {
      ...structuredClone(base.input),
      ...structuredClone(patch),
    },
  }
}

function approvalStatus(outcome) {
  if (outcome === 'allowed-once') return 'approved'
  return outcome
}

function callIndexFromId(callId) {
  const match = String(callId ?? '').match(/-(\d+)$/)
  return match ? Number(match[1]) : null
}

function toolDefinition({ actionTarget, principal, scenario, store, state, evidence }) {
  return defineTool({
    name: TOOL_NAME,
    description: 'ActionSeam synthetic balance effect for public DSH ToolRuntime profile evidence.',
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
      const callIndex = state.toolBodyCalls + 1
      state.toolBodyCalls += 1
      const action = {
        capability: 'synthetic.adjust-balance',
        input: structuredClone(args),
      }
      const effectId = `effect:dsh-public:${digest({ scenarioId: scenario.id, callIndex, action, principal })}`
      const result = await actionTarget.invoke({
        action,
        principal,
        effectId,
        store,
        fault: scenario.fault,
      })
      state.actionTargetResults.push(structuredClone(result))
      evidence.append('action.attempt', {
        effectId,
        result: structuredClone(result),
        attempt: callIndex,
        callIndex,
        dispatch: 'dsh-public-toolruntime',
      })
      if (!result.ok) {
        const error = new Error(`ActionTarget failed: ${result.code ?? 'UNKNOWN'}`)
        error.code = result.code ?? 'ACTION_TARGET_FAILED'
        throw error
      }
      return structuredClone(result.value)
    },
  })
}

async function executePublicProfile({ scenario, actionTarget, store }) {
  const evidence = new EvidenceLog()
  const principal = structuredClone(scenario.trustedPrincipal)
  const previousDshHome = process.env.DSH_HOME
  const previousAgentsHome = process.env.DSH_AGENTS_HOME
  const dshHome = await mkdtemp(join(tmpdir(), 'actionseam-dsh-public-profile-home-'))
  const agentsHome = await mkdtemp(join(tmpdir(), 'actionseam-dsh-public-profile-agents-'))
  const ctx = new Context()
  let handle

  process.env.DSH_HOME = dshHome
  process.env.DSH_AGENTS_HOME = agentsHome

  const state = {
    actionTargetResults: [],
    approvalAnswers: [],
    approvalAudit: [],
    askedById: new Map(),
    toolBodyCalls: 0,
    toolResults: [],
  }

  try {
    await ctx.plugin(agentSpine, {
      workspaceContext: false,
      toolBash: false,
      goals: false,
    })
    await waitForServices(ctx, ['llm', 'sessions', 'systemPrompt', 'tools', 'agents'])
    ctx.llm.registerAdapter([PROVIDER], new NoopAdapter())

    if (scenario.id === APPROVAL_SCENARIO) {
      await ctx.plugin(ApprovalService, { policy: 'ask' })
      await waitForServices(ctx, ['approval'])
    }

    ctx.tools.register(toolDefinition({ actionTarget, principal, scenario, store, state, evidence }))

    ctx.on('tools/pre-execute', async (exec, next) => {
      if (exec.name !== TOOL_NAME) return next()
      evidence.append('dsh.tools.pre-execute', {
        callId: String(exec.callId),
        arguments: structuredClone(exec.arguments),
        argumentsFrozen: Object.isFrozen(exec.arguments),
      })
      if (scenario.id === APPROVAL_SCENARIO) {
        return { kind: 'ask', reason: 'ActionSeam one-shot approval profile' }
      }
      return next()
    })

    ctx.on('tools/execute', async (exec, next) => {
      if (exec.name !== TOOL_NAME || scenario.id !== IMMUTABILITY_SCENARIO) return next()
      const before = structuredClone(exec.arguments)
      let mutationError = null
      try {
        Object.assign(exec.arguments, structuredClone(scenario.disturbance?.patch ?? {}))
      } catch (error) {
        mutationError = {
          name: error?.name ?? 'Error',
          message: error?.message ?? String(error),
        }
      }
      const after = structuredClone(exec.arguments)
      const mutationApplied = JSON.stringify(before) !== JSON.stringify(after)
      evidence.append('action.arguments-immutable', {
        attemptedPatch: structuredClone(scenario.disturbance?.patch ?? {}),
        mutationApplied,
        argumentsFrozen: Object.isFrozen(exec.arguments),
        beforeDigest: digest(before),
        afterDigest: digest(after),
        mutationError,
      })
      return next()
    })

    ctx.on('tools/result', (exec, result) => {
      if (exec.name !== TOOL_NAME) return
      state.toolResults.push({
        callId: String(exec.callId),
        isError: result.isError === true,
        errorCode: result.error?.info?.code ?? null,
        errorMessage: result.error?.message ?? null,
      })
      evidence.append('dsh.tools.result', structuredClone(state.toolResults.at(-1)))
    })

    if (scenario.id === APPROVAL_SCENARIO) {
      ctx.on('approval/request', (req) => {
        const callIndex = callIndexFromId(req.callId)
        const configured = scenario.approvalSequence?.decisions?.[state.approvalAnswers.length]
        const outcome = configured === 'allow-once' ? 'allowed-once' : 'rejected'
        state.approvalAnswers.push(outcome)
        evidence.append('dsh.approval.request', {
          callId: String(req.callId ?? ''),
          callIndex,
          toolName: req.toolName,
          outcome,
        })
        return Promise.resolve(outcome)
      })

      ctx.on('session/event', (_session, event) => {
        if (event.type === 'approval/asked') {
          const data = structuredClone(event.data)
          const callIndex = callIndexFromId(data.callId)
          state.askedById.set(String(data.id), callIndex)
          state.approvalAudit.push({ type: event.type, data })
          evidence.append('dsh.approval.asked', { ...data, callIndex })
        }
        if (event.type === 'approval/decided') {
          const data = structuredClone(event.data)
          const callIndex = state.askedById.get(String(data.id)) ?? null
          state.approvalAudit.push({ type: event.type, data })
          evidence.append('dsh.approval.decided', { ...data, callIndex })
          const action = callIndex === 2
            ? materialAction(scenario.action, scenario.approvalSequence?.secondPatch ?? {})
            : structuredClone(scenario.action)
          evidence.append('authority.approval', {
            actionDigest: digest(action),
            status: approvalStatus(data.outcome),
            decision: data.outcome,
            callIndex,
            callId: callIndex === null ? null : `actionseam-profile-call-${callIndex}`,
          })
        }
      })
    }

    handle = await ctx.agents.create({
      sessionId: `actionseam-public-${scenario.id}`,
      meta: { cwd: process.cwd() },
      agentOptions: { provider: PROVIDER, model: MODEL },
    })

    evidence.append('identity.established', { principal, source: 'actionseam-trusted-runtime-context' })
    evidence.append('action.proposed', { actionDigest: digest(scenario.action), action: structuredClone(scenario.action), callIndex: 1 })

    if (scenario.id === APPROVAL_SCENARIO) {
      handle.agent.session.append('turn/start', { turn: 1 })
      const first = await ctx.tools.execute({
        callId: CallId('actionseam-profile-call-1'),
        name: TOOL_NAME,
        arguments: structuredClone(scenario.action.input),
        signal: new AbortController().signal,
        agent: handle.agent,
      })

      const secondAction = materialAction(scenario.action, scenario.approvalSequence?.secondPatch ?? {})
      evidence.append('action.proposed', { actionDigest: digest(secondAction), action: secondAction, callIndex: 2 })
      const second = await ctx.tools.execute({
        callId: CallId('actionseam-profile-call-2'),
        name: TOOL_NAME,
        arguments: structuredClone(secondAction.input),
        signal: new AbortController().signal,
        agent: handle.agent,
      })
      handle.agent.session.append('turn/end', { turn: 1, reason: { kind: 'completed' } })

      const auditTypes = state.approvalAudit.map((entry) => entry.type)
      const freshDecisions = state.approvalAnswers.length === 2
        && state.approvalAnswers[0] === 'allowed-once'
        && state.approvalAnswers[1] === 'rejected'
      const outcome = !first.isError && second.isError && state.toolBodyCalls === 1 && freshDecisions
        ? 'SECOND_CALL_DENIED'
        : 'ACTION_FAILED'
      evidence.append('dsh.approval.audit', {
        auditTypes,
        decisions: [...state.approvalAnswers],
        toolBodyCalls: state.toolBodyCalls,
      })
      evidence.append('action.terminal', { outcome, result: state.actionTargetResults[0] ?? null })
      return {
        outcome,
        principal,
        result: state.actionTargetResults[0] ?? null,
        evidence: evidence.all(),
      }
    }

    const direct = await ctx.tools.execute({
      callId: CallId('actionseam-profile-call-1'),
      name: TOOL_NAME,
      arguments: structuredClone(scenario.action.input),
      signal: new AbortController().signal,
      agent: handle.agent,
    })
    const result = state.actionTargetResults[0] ?? null
    const outcome = !direct.isError && result?.ok ? 'COMPLETED' : 'ACTION_FAILED'
    evidence.append('action.terminal', { outcome, result: structuredClone(result) })
    return { outcome, principal, result, evidence: evidence.all() }
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

export class DeepSeekHarnessExtendedRuntime {
  metadata = Object.freeze({
    id: 'deepseek-harness.public-runtime-surfaces',
    version: '0.1.0-rc.7',
    adapter: 'actionseam.deepseek-harness-runtime',
    adapterVersion: '0.2.0-experimental',
    upstreamCommit: '99f6f02fecdb7dff40c3fbc9470f5907c29f74ca',
    mode: 'profile-specific-public-surface',
  })

  #base = new DeepSeekHarnessRuntime()

  async execute(args) {
    if ([APPROVAL_SCENARIO, IMMUTABILITY_SCENARIO].includes(args.scenario.id)) {
      return executePublicProfile(args)
    }
    return this.#base.execute(args)
  }
}
