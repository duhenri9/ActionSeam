import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Readable, Writable } from 'node:stream'

import {
  ClientSideConnection,
  ndJsonStream,
  PROTOCOL_VERSION,
} from '@agentclientprotocol/sdk'

import { FINAL_TEXT, USER_TEXT } from './fixture.js'
import { runDirectBaseline } from './direct.js'

const here = dirname(fileURLToPath(import.meta.url))

function normalizeAcpEffect(raw) {
  return structuredClone(raw.effect)
}

function comparePaths(direct, acp) {
  const mismatches = []
  if (direct.inputAccepted !== acp.inputAccepted) mismatches.push('input-admission')
  if (direct.finalText !== acp.finalText) mismatches.push('final-text')
  if (JSON.stringify(direct.effect) !== JSON.stringify(acp.effect)) mismatches.push('synthetic-effect')
  if (direct.networkModelCalls !== acp.networkModelCalls) mismatches.push('network-model-calls')
  return { pass: mismatches.length === 0, mismatches }
}

async function runAcpStdio() {
  const temp = await mkdtemp(join(tmpdir(), 'actionseam-acp-transport-'))
  const effectPath = join(temp, 'effect.json')
  const dshHome = join(temp, '.dsh')
  const agentsHome = join(temp, '.agents')
  const serverPath = join(here, 'server.js')
  const child = spawn(process.execPath, [serverPath], {
    cwd: here,
    env: {
      ...process.env,
      ACTIONSEAM_ACP_EFFECT_PATH: effectPath,
      DSH_HOME: dshHome,
      DSH_AGENTS_HOME: agentsHome,
    },
    stdio: ['pipe', 'pipe', 'pipe'],
  })

  const stderr = []
  child.stderr.setEncoding('utf8')
  child.stderr.on('data', (chunk) => stderr.push(chunk))

  const rawStdout = []
  const passthrough = new Readable({ read() {} })
  child.stdout.on('data', (buffer) => {
    rawStdout.push(buffer.toString('utf8'))
    passthrough.push(buffer)
  })
  child.stdout.on('end', () => passthrough.push(null))

  const stream = ndJsonStream(
    Writable.toWeb(child.stdin),
    Readable.toWeb(passthrough),
  )
  const updates = []
  const permissionRequests = []
  const makeClient = () => ({
    sessionUpdate(params) {
      updates.push(structuredClone(params.update))
      return Promise.resolve()
    },
    requestPermission(params) {
      permissionRequests.push(structuredClone(params))
      return Promise.resolve({ outcome: { outcome: 'cancelled' } })
    },
  })
  const client = new ClientSideConnection(makeClient, stream)

  let exitResult
  try {
    const init = await client.initialize({ protocolVersion: PROTOCOL_VERSION, clientCapabilities: {} })
    assert.deepEqual(init.agentCapabilities, {
      promptCapabilities: { image: false, audio: false, embeddedContext: false },
    })

    const { sessionId } = await client.newSession({ cwd: temp, mcpServers: [] })
    const prompt = await client.prompt({
      sessionId,
      prompt: [{ type: 'text', text: USER_TEXT }],
    })
    assert.equal(prompt.stopReason, 'end_turn')

    const committedText = updates
      .filter((update) => update?.sessionUpdate === 'agent_message_chunk' && update.content?.type === 'text')
      .map((update) => update.content.text)
      .join('')
    assert.equal(committedText, FINAL_TEXT)
    assert.equal(permissionRequests.length, 0)

    const rawEffect = JSON.parse(await readFile(effectPath, 'utf8'))
    const frames = rawStdout.join('').split('\n').filter((line) => line.trim().length > 0)
    assert.ok(frames.length > 0, 'ACP stdout must contain protocol frames.')
    for (const line of frames) JSON.parse(line)

    const protocolMethods = frames.map((line) => {
      const frame = JSON.parse(line)
      return frame.method ?? (frame.result !== undefined ? 'response:result' : frame.error !== undefined ? 'response:error' : 'response')
    })

    return {
      path: 'acp-jsonrpc-stdio-child-process',
      inputAccepted: rawEffect.inputAccepted === true,
      networkModelCalls: rawEffect.networkModelCalls,
      finalText: committedText,
      effect: normalizeAcpEffect(rawEffect),
      protocol: {
        version: PROTOCOL_VERSION,
        initializeCapabilities: init.agentCapabilities,
        newSession: true,
        promptStopReason: prompt.stopReason,
        committedUpdateTypes: updates.map((update) => update.sessionUpdate),
        permissionRequests: permissionRequests.length,
        stdoutFrameCount: frames.length,
        stdoutProtocolPure: true,
        observedMethods: protocolMethods,
      },
      stderrBytes: Buffer.byteLength(stderr.join('')),
    }
  } finally {
    exitResult = await new Promise((resolve) => {
      if (child.exitCode !== null || child.signalCode !== null) {
        resolve({ code: child.exitCode, signal: child.signalCode })
        return
      }
      child.once('exit', (code, signal) => resolve({ code, signal }))
      child.kill('SIGTERM')
    })
    await rm(temp, { recursive: true, force: true })
  }
}

const direct = await runDirectBaseline()
const acp = await runAcpStdio()
const differential = comparePaths(direct, acp)
assert.equal(differential.pass, true, `ACP transport diverged from direct path: ${differential.mismatches.join(', ')}`)
assert.equal(acp.effect.toolExecutions, 1)
assert.deepEqual(acp.effect.arguments, direct.effect.arguments)
assert.equal(acp.protocol.stdoutProtocolPure, true)

const corrupted = structuredClone(acp)
corrupted.effect.effect.value += 1000
const negativeControl = comparePaths(direct, corrupted)
assert.equal(negativeControl.pass, false, 'Transport comparator failed to detect a deliberately corrupted committed effect.')
assert.ok(negativeControl.mismatches.includes('synthetic-effect'))

console.log(JSON.stringify({
  upstream: 'deepseek-ai/deepseek-harness@99f6f02fecdb7dff40c3fbc9470f5907c29f74ca',
  package: '@deepseek-ai/dsh-acp@0.1.0-rc.7',
  sdk: '@agentclientprotocol/sdk@0.25.1',
  transportSupportStatus: 'NOT_PROMOTED',
  evidenceKind: 'direct-vs-acp-jsonrpc-stdio-child-process',
  direct,
  acp,
  differential,
  negativeControl: {
    detected: negativeControl.pass === false,
    mismatches: negativeControl.mismatches,
    corruption: 'committed effect value +1000',
  },
  scope: {
    proven: [
      'initialize',
      'session/new',
      'session/prompt',
      'committed agent_message_chunk output',
      'end_turn settlement',
      'stdout JSON-RPC purity',
      'same synthetic tool/effect semantics as direct path',
    ],
    notClaimed: [
      'session/request_permission differential',
      'session/cancel differential',
      'multi-session isolation',
      'image prompts',
      'MCP',
      'HTTP',
      'Web/GUI RPC',
      'all seven runtime profiles over ACP',
      'production safety',
    ],
  },
}, null, 2))
