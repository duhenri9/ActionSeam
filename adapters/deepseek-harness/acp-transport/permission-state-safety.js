import assert from 'node:assert/strict'
import test from 'node:test'

import { createAtomicStatePublisher } from './atomic-state-publisher.js'

test('permission evidence publishes serially and moves only complete snapshots', async () => {
  let inFlightWrites = 0
  let maxInFlightWrites = 0
  let snapshotValue = 0
  const writes = []
  const moves = []

  const publisher = createAtomicStatePublisher(
    '/synthetic/permission-state.json',
    () => ({ snapshotValue: ++snapshotValue }),
    {
      async write(path, content, encoding) {
        assert.equal(path, '/synthetic/permission-state.json.partial')
        assert.equal(encoding, 'utf8')
        inFlightWrites += 1
        maxInFlightWrites = Math.max(maxInFlightWrites, inFlightWrites)
        const parsed = JSON.parse(content)
        await new Promise((resolve) => setTimeout(resolve, parsed.evidenceRevision === 1 ? 20 : 1))
        writes.push(parsed)
        inFlightWrites -= 1
      },
      async move(from, to) {
        assert.equal(from, '/synthetic/permission-state.json.partial')
        assert.equal(to, '/synthetic/permission-state.json')
        assert.equal(inFlightWrites, 0)
        moves.push({ from, to })
      },
    },
  )

  const first = publisher.publish()
  const second = publisher.publish()
  const third = publisher.publish()
  const results = await Promise.all([first, second, third])
  await publisher.flush()

  assert.equal(maxInFlightWrites, 1)
  assert.deepEqual(writes.map(({ evidenceRevision }) => evidenceRevision), [1, 2, 3])
  assert.deepEqual(writes.map(({ snapshotValue: value }) => value), [1, 2, 3])
  assert.deepEqual(results.map(({ evidenceRevision }) => evidenceRevision), [1, 2, 3])
  assert.equal(moves.length, 3)
})

test('permission evidence queue fails closed after a persistence error', async () => {
  const failure = new Error('synthetic persistence failure')
  let writeCalls = 0

  const publisher = createAtomicStatePublisher(
    '/synthetic/permission-state.json',
    () => ({ ok: true }),
    {
      async write() {
        writeCalls += 1
        throw failure
      },
      async move() {
        throw new Error('move must not run after failed write')
      },
    },
  )

  await assert.rejects(publisher.publish(), failure)
  await assert.rejects(publisher.flush(), failure)
  await assert.rejects(publisher.publish(), failure)
  assert.equal(writeCalls, 1)
})
