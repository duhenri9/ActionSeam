import { rename, writeFile } from 'node:fs/promises'

export function createAtomicStatePublisher(path, snapshot, io = {}) {
  const write = io.write ?? writeFile
  const move = io.move ?? rename
  let queue = Promise.resolve()
  let revision = 0

  async function persistLatest() {
    const body = {
      evidenceRevision: ++revision,
      ...snapshot(),
    }
    const staging = `${path}.partial`
    await write(staging, `${JSON.stringify(body, null, 2)}\n`, 'utf8')
    await move(staging, path)
    return body
  }

  return {
    publish() {
      queue = queue.then(persistLatest)
      return queue
    },
    flush() {
      return queue
    },
  }
}
