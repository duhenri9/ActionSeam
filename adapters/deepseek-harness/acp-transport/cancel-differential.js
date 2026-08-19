import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { access, mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Readable, Writable } from 'node:stream'

import {
  ClientSideConnection,
  ndJsonStream,
  PROTOCOL_VERSION,
} from '@agentclientprotocol/sdk'

import { CANCEL_USER_TEXT } from './cancel-common.js'
import { runDirectCancellation } from './cancel-direct.js'

const here = dirname(fileURLToPath(import.meta.url))

function withDeadline(promise, label, timeoutMs) {
  let timer
  const deadline = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`ACP cancellation phase timed out: ${label}`)), timeoutMs)
  })
  return Promise.race([promise, deadline]).finally(() => clearTimeout(timer))
}

async function fileExists(path) {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

async function waitForJson(path, label, timeoutMs = 5000) {
  const started = Date.now()
  for (;;) {
    if (await fileExists(path)) {
      return JSON.parse(await readFile(path, 'utf8'))
    }
    if (Date.now() - started >= timeoutMs) throw new Error(`Timed out waiting for ${label}.`)
    await new Promise((resolve) => setTimeout(resolve, 25))
  }
}

function semanticState(result) {
  return {
    cancelSettled: result.cancelSettled === true,
    modelStarted: result.modelStarted === true,
    modelAbortObserved: result.modelAbortObserved === true,
    networkModelCalls: result.networkModelCalls,
    toolExecutions: result.toolExecutions,
    effectCount: result.effectCount,
  }
}

function compareCancellation(direct, acp) {
  const left = semanticState(direct)
  const right = semanticState(acp)
  const mismatches = []
  for (const key of Object.keys(left)) {
    if (left[key] !== right[key]) mismatches.push(key)
  }
  return { pass: mismatches.length === 0, mismatches, direct: left, acp: right }
}

async function terminateChild(child) {
  if (child.exitCode !== null || child.signalCode !== null) {
    return { code: child.exitCode, signal: child.signalCode }
  }
  const exited = new Promise((resolve) => child.once('exit', (code, signal) => resolve({ code, signal })))
  child.kill('SIGKILL')
  return withDeadline(exited, 'child-process termination', 5000)
}

function capturedWritable(child, chunks) {
  return new Writable({
    write(chunk, _encoding, callback) {
      chunks.push(Buffer.from(chunk).toString('utf8'))
      if (child.stdin.write(chunk)) callback()
      else child.stdin.once('drain', callback)
    },
  })
}

async function runAcpCancellation() {
  const temp = await mkdtemp(join(tmpdir(), 'actionseam-acp-cancel-'))
  const startPath = join(temp, 'model-start.json')
  const abortPath = join(temp, 'model-abort.json')
  const toolStartPath = join(temp, 'tool-start.json')
  const effectPath = join(temp, 'effect.json')
  const dshHome = join(temp, '.dsh')
  const agentsHome = join(temp, '.agents')
  const serverPath = join(here, 'cancel-server.js')
  const child = spawn(process.execPath, [serverPath], {
    cwd: here,
    env: {
      ...process.env,
      ACTIONSEAM_ACP_CANCEL_START_PATH: startPath,
      ACTIONSEAM_ACP_CANCEL_ABORT_PATH: abortPath,
      ACTIONSEAM_ACP_CANCEL_TOOL_START_PATH: toolStartPath,
      ACTIONSEAM_ACP_CANCEL_EFFECT_PATH: effectPath,
      DSH_HOME: dshHome,
      DSH_AGENTS_HOME: agentsHome,
    },
    stdio: ['pipe', 'pipe', 'pipe'],
  })

  const stderr = []
  child.stderr.setEncoding('utf8')
  child.stderr.on('data', (chunk) => stderr.push(chunk))

  const rawStdout = []
  const stdoutPassthrough = new Readable({ read() {} })
  child.stdout.on('data', (buffer) => {
    rawStdout.push(buffer.toString('utf8'))
    stdoutPassthrough.push(buffer)
  })
  child.stdout.on('end', () => stdoutPassthrough.push(null))

  const rawStdin = []
  const stdinCapture = capturedWritable(child, rawStdin)
  const stream = ndJsonStream(
    Writable.toWeb(stdinCapture),
    Readable.toWeb(stdoutPassthrough),
  )

  const updates = []
  const client = new ClientSideConnection(() => ({
    sessionUpdate(params) {
      updates.push(structuredClone(params.update))
      return Promise.resolve()
    },
    requestPermission() {
      throw new Error('Pre-dispatch cancellation probe must not request permission.')
    },
  }), stream)

  try {
    const init = await withDeadline(
      client.initialize({ protocolVersion: PROTOCOL_VERSION, clientCapabilities: {} }),
      'initialize',
      8000,
    )
    const { sessionId } = await withDeadline(
      client.newSession({ cwd: temp, mcpServers: [] }),
      'session/new',
      8000,
    )

    const promptPromise = client.prompt({
      sessionId,
      prompt: [{ type: 'text', text: CANCEL_USER_TEXT }],
    })
    // The real await remains below after cancellation. This handler prevents
    // an earlier probe failure from turning a later child-termination rejection
    // into an unhandled process-level error that hides the original diagnostic.
    promptPromise.catch(() => {})

    const modelStart = await waitForJson(startPath, 'in-flight model evidence', 8000)
    assert.equal(modelStart.signalPresent, true)
    assert.equal(modelStart.signalAbortedAtStart, false)
    assert.equal(await fileExists(toolStartPath), false, 'Tool body began before ACP cancellation was sent.')
    assert.equal(await fileExists(effectPath), false, 'Synthetic effect committed before ACP cancellation was sent.')

    await withDeadline(client.cancel({ sessionId }), 'session/cancel notification write', 3000)
    const modelAbort = await waitForJson(abortPath, 'model abort evidence', 5000)
    assert.equal(modelAbort.signalAborted, true)

    const prompt = await withDeadline(promptPromise, 'original session/prompt settlement', 10000)
    assert.equal(prompt.stopReason, 'cancelled')
    assert.equal(await fileExists(toolStartPath), false, 'A tool body began after ACP cancellation.')
    assert.equal(await fileExists(effectPath), false, 'A synthetic effect committed after ACP cancellation.')

    const inboundFrames = rawStdin.join('').split('\n').filter((line) => line.trim().length > 0).map((line) => JSON.parse(line))
    const cancelFrames = inboundFrames.filter((frame) => frame.method === 'session/cancel')
    assert.equal(cancelFrames.length, 1, `Expected exactly one session/cancel frame, observed ${cancelFrames.length}.`)
    assert.equal(cancelFrames[0].id, undefined, 'session/cancel must be a JSON-RPC notification without an id.')
    assert.equal(cancelFrames[0].params?.sessionId, sessionId, 'session/cancel targeted the wrong ACP session.')

    const outboundFrames = rawStdout.join('').split('\n').filter((line) => line.trim().length > 0)
    for (const line of outboundFrames) JSON.parse(line)

    return {
      path: 'acp-jsonrpc-stdio-session-cancel',
      cancelSettled: prompt.stopReason === 'cancelled',
      modelStarted: true,
      modelAbortObserved: modelAbort.signalAborted === true,
      networkModelCalls: modelAbort.networkModelCalls,
      toolExecutions: 0,
      effectCount: 0,
      modelStart,
      modelAbort,
      protocol: {
        version: PROTOCOL_VERSION,
        sessionId,
        cancelMethod: cancelFrames[0].method,
        cancelNotification: cancelFrames[0].id === undefined,
        cancelTargetMatched: cancelFrames[0].params?.sessionId === sessionId,
        promptStopReason: prompt.stopReason,
        stdinFrameCount: inboundFrames.length,
        stdoutFrameCount: outboundFrames.length,
        stdoutProtocolPure: true,
        committedUpdateTypes: updates.map((update) => update.sessionUpdate),
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

const directRaw = await withDeadline(runDirectCancellation(), 'direct cancellation control', 15000)
const directTurnCancelled = directRaw.turnEndReasons.length === 1
  && directRaw.turnEndReasons[0]?.kind === 'aborted'
  && directRaw.turnEndReasons[0]?.reason?.kind === 'user'
const direct = {
  path: directRaw.path,
  cancelSettled: directTurnCancelled,
  modelStarted: directRaw.modelStart.signalPresent === true,
  modelAbortObserved: directRaw.state.modelAbortObserved,
  networkModelCalls: directRaw.state.networkModelCalls,
  toolExecutions: directRaw.state.toolExecutions,
  effectCount: directRaw.state.effectCount,
  modelStart: directRaw.modelStart,
  modelAbort: directRaw.modelAbort,
  turnEndReasons: directRaw.turnEndReasons,
}
const acp = await runAcpCancellation()
const differential = compareCancellation(direct, acp)
assert.equal(differential.pass, true, `ACP cancellation diverged from direct cancellation: ${differential.mismatches.join(', ')}`)
assert.equal(direct.cancelSettled, true, 'Direct Agent cancellation did not settle with turn/end aborted by user.')
assert.equal(acp.protocol.cancelMethod, 'session/cancel')
assert.equal(acp.protocol.cancelNotification, true)
assert.equal(acp.protocol.cancelTargetMatched, true)
assert.equal(acp.protocol.promptStopReason, 'cancelled')
assert.equal(acp.toolExecutions, 0)
assert.equal(acp.effectCount, 0)

const corrupted = structuredClone(acp)
corrupted.toolExecutions = 1
corrupted.effectCount = 1
const negativeControl = compareCancellation(direct, corrupted)
assert.equal(negativeControl.pass, false, 'Cancellation comparator failed to detect a synthetic post-cancel tool/effect.')
assert.ok(negativeControl.mismatches.includes('toolExecutions'))
assert.ok(negativeControl.mismatches.includes('effectCount'))

console.log(JSON.stringify({
  upstream: 'deepseek-ai/deepseek-harness@99f6f02fecdb7dff40c3fbc9470f5907c29f74ca',
  package: '@deepseek-ai/dsh-acp@0.1.0-rc.7',
  sdk: '@agentclientprotocol/sdk@0.25.1',
  evidenceKind: 'direct-vs-acp-session-cancel-pre-dispatch',
  claimCandidate: 'ACP session/cancel pre-dispatch cancellation equivalence',
  direct,
  acp,
  differential,
  negativeControl: {
    detected: negativeControl.pass === false,
    mismatches: negativeControl.mismatches,
    corruption: 'synthetic post-cancel tool execution + effect',
  },
  scope: {
    candidateProven: [
      'model request is in flight before cancellation',
      'official ACP SDK emits real session/cancel notification for the exact active session',
      'DSH model AbortSignal is observed after cancellation',
      'direct Agent turn settles with turn/end aborted by user',
      'original session/prompt settles as cancelled',
      'zero tool-body executions',
      'zero synthetic effects',
      'same pre-dispatch cancellation semantics as direct public Agent cancellation',
    ],
    notClaimed: [
      'rollback after a tool body has started',
      'rollback of a committed effect',
      'cancellation of a non-cooperative running tool',
      'cancelled permission-response equivalence',
      'multi-session isolation',
      'image prompts',
      'graceful process shutdown',
      'all seven runtime profiles over ACP',
      'MCP/HTTP/Web transport equivalence',
      'production safety',
    ],
  },
}, null, 2))
