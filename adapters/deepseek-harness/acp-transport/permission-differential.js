import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { access, mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { Readable, Writable } from 'node:stream'
import { fileURLToPath } from 'node:url'

import { ClientSideConnection, ndJsonStream, PROTOCOL_VERSION } from '@agentclientprotocol/sdk'

import { FINAL_TEXT, USER_TEXT } from './fixture.js'
import { PERMISSION_DECISIONS, expectedApprovalOutcome } from './permission-common.js'
import { runDirectPermission } from './permission-direct.js'

const here = dirname(fileURLToPath(import.meta.url))

function withDeadline(promise, label, timeoutMs) {
  let timer
  const deadline = new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(`ACP permission phase timed out: ${label}`)), timeoutMs) })
  return Promise.race([promise, deadline]).finally(() => clearTimeout(timer))
}

async function terminateChild(child) {
  if (child.exitCode !== null || child.signalCode !== null) return
  const exited = new Promise((resolve) => child.once('exit', resolve))
  child.kill('SIGKILL')
  await withDeadline(exited, 'child termination', 5000)
}

async function readSettledState(path, timeoutMs = 5000) {
  const started = Date.now()
  for (;;) {
    try {
      await access(path)
      const parsed = JSON.parse(await readFile(path, 'utf8'))
      if (parsed.approvalOutcome !== null && parsed.toolResult !== null) return parsed
    } catch {}
    if (Date.now() - started >= timeoutMs) throw new Error('ACP permission state did not settle')
    await new Promise((resolve) => setTimeout(resolve, 25))
  }
}

function comparePermission(direct, acp) {
  const mismatches = []
  if (direct.requestedDecision !== acp.requestedDecision) mismatches.push('requested-decision')
  if (direct.approvalOutcome !== acp.approvalOutcome) mismatches.push('approval-outcome')
  if (direct.toolExecutions !== acp.toolExecutions) mismatches.push('tool-executions')
  if (JSON.stringify(direct.effect) !== JSON.stringify(acp.effect)) mismatches.push('effect')
  if (direct.finalText !== acp.finalText) mismatches.push('final-text')
  if (direct.networkModelCalls !== acp.networkModelCalls) mismatches.push('network-model-calls')
  return { pass: mismatches.length === 0, mismatches }
}

async function runAcpPermission(decision) {
  const expected = expectedApprovalOutcome(decision)
  const temp = await mkdtemp(join(tmpdir(), `actionseam-acp-permission-${decision}-`))
  const statePath = join(temp, 'permission-state.json')
  const serverPath = join(here, 'permission-server.js')
  const child = spawn(process.execPath, [serverPath], {
    cwd: here,
    env: {
      ...process.env,
      ACTIONSEAM_ACP_PERMISSION_STATE_PATH: statePath,
      DSH_HOME: join(temp, '.dsh'),
      DSH_AGENTS_HOME: join(temp, '.agents'),
    },
    stdio: ['pipe', 'pipe', 'pipe'],
  })

  const stderr = []
  child.stderr.setEncoding('utf8')
  child.stderr.on('data', (chunk) => stderr.push(chunk))
  const rawStdout = []
  const passthrough = new Readable({ read() {} })
  child.stdout.on('data', (buffer) => { rawStdout.push(buffer.toString('utf8')); passthrough.push(buffer) })
  child.stdout.on('end', () => passthrough.push(null))

  const stream = ndJsonStream(Writable.toWeb(child.stdin), Readable.toWeb(passthrough))
  const updates = []
  const permissionRequests = []
  let sessionId = null
  const client = new ClientSideConnection(() => ({
    sessionUpdate(params) {
      updates.push(structuredClone(params.update))
      return Promise.resolve()
    },
    requestPermission(params) {
      permissionRequests.push(structuredClone(params))
      const option = params.options.find((candidate) => candidate.optionId === decision)
      if (option === undefined) return Promise.resolve({ outcome: { outcome: 'cancelled' } })
      return Promise.resolve({ outcome: { outcome: 'selected', optionId: option.optionId } })
    },
  }), stream)

  try {
    await withDeadline(client.initialize({ protocolVersion: PROTOCOL_VERSION, clientCapabilities: {} }), `${decision} initialize`, 8000)
    const created = await withDeadline(client.newSession({ cwd: temp, mcpServers: [] }), `${decision} session/new`, 8000)
    sessionId = created.sessionId
    const prompt = await withDeadline(client.prompt({ sessionId, prompt: [{ type: 'text', text: USER_TEXT }] }), `${decision} session/prompt`, 15000)
    assert.equal(prompt.stopReason, 'end_turn')

    const state = await readSettledState(statePath)
    const finalText = updates
      .filter((update) => update?.sessionUpdate === 'agent_message_chunk' && update.content?.type === 'text')
      .map((update) => update.content.text)
      .join('')
    assert.equal(finalText, FINAL_TEXT)
    assert.equal(permissionRequests.length, 1)

    const request = permissionRequests[0]
    assert.equal(request.sessionId, sessionId)
    assert.equal(String(request.toolCall.toolCallId), 'actionseam-transport-call-1')
    assert.deepEqual(
      request.options.map((option) => ({ optionId: option.optionId, kind: option.kind })).sort((a, b) => a.optionId.localeCompare(b.optionId)),
      [
        { optionId: 'allow-once', kind: 'allow_once' },
        { optionId: 'reject-once', kind: 'reject_once' },
      ],
    )
    assert.equal(state.approvalOutcome, expected)
    if (decision === 'allow-once') {
      assert.equal(state.toolExecutions, 1)
      assert.ok(state.effect)
    } else {
      assert.equal(state.toolExecutions, 0)
      assert.equal(state.effect, null)
    }

    const frames = rawStdout.join('').split('\n').filter((line) => line.trim().length > 0)
    for (const line of frames) JSON.parse(line)
    const methods = frames.map((line) => JSON.parse(line).method).filter(Boolean)
    assert.ok(methods.includes('session/request_permission'))

    return {
      path: 'acp-jsonrpc-stdio-permission',
      requestedDecision: decision,
      approvalOutcome: state.approvalOutcome,
      permissionRequest: {
        sessionMatches: request.sessionId === sessionId,
        toolCallId: String(request.toolCall.toolCallId),
        options: request.options.map((option) => ({ optionId: option.optionId, kind: option.kind })),
      },
      approvalAuditTypes: state.approvalAudit.map((entry) => entry.type),
      toolExecutions: state.toolExecutions,
      effect: state.effect,
      networkModelCalls: 0,
      finalText,
      protocol: {
        promptStopReason: prompt.stopReason,
        stdoutProtocolPure: true,
        observedMethods: methods,
      },
      stderrBytes: Buffer.byteLength(stderr.join('')),
    }
  } catch (error) {
    const diagnostic = stderr.join('').trim()
    throw new Error(`${error?.message ?? String(error)}${diagnostic ? `\nACP child stderr:\n${diagnostic}` : ''}`)
  } finally {
    await terminateChild(child)
    await rm(temp, { recursive: true, force: true })
  }
}

const cases = []
for (const decision of PERMISSION_DECISIONS) {
  const direct = await withDeadline(runDirectPermission(decision), `${decision} direct baseline`, 15000)
  const acp = await runAcpPermission(decision)
  const differential = comparePermission(direct, acp)
  assert.equal(differential.pass, true, `${decision} permission transport diverged: ${differential.mismatches.join(', ')}`)
  cases.push({ decision, direct, acp, differential })
}

const rejectCase = cases.find((entry) => entry.decision === 'reject-once')
const allowCase = cases.find((entry) => entry.decision === 'allow-once')
const corrupted = structuredClone(rejectCase.acp)
corrupted.toolExecutions = allowCase.acp.toolExecutions
corrupted.effect = structuredClone(allowCase.acp.effect)
const negativeControl = comparePermission(rejectCase.direct, corrupted)
assert.equal(negativeControl.pass, false)
assert.ok(negativeControl.mismatches.includes('tool-executions'))
assert.ok(negativeControl.mismatches.includes('effect'))

console.log(JSON.stringify({
  upstream: 'deepseek-ai/deepseek-harness@99f6f02fecdb7dff40c3fbc9470f5907c29f74ca',
  transport: '@deepseek-ai/dsh-acp@0.1.0-rc.7',
  approval: '@deepseek-ai/dsh-user-approval@0.1.0-rc.7',
  sdk: '@agentclientprotocol/sdk@0.25.1',
  permissionTransportSupportStatus: 'NOT_PROMOTED',
  evidenceKind: 'direct-vs-acp-request-permission-allow-reject',
  cases,
  negativeControl: {
    detected: negativeControl.pass === false,
    mismatches: negativeControl.mismatches,
    corruption: 'inject allow-once effect into reject-once ACP result',
  },
  notClaimed: [
    'cancelled permission response differential',
    'session/cancel differential',
    'multi-session isolation',
    'image prompts',
    'graceful shutdown',
    'all seven runtime profiles over ACP',
    'MCP/HTTP/Web equivalence',
  ],
}, null, 2))
