import { rename, writeFile } from 'node:fs/promises'

export function createAtomicStatePublisher(path, snapshot) {
  let queue = Promise.resolve()
  let revision = 0

  async function persistLatest() {
    const body = {
      evidenceRevision: ++revision,
      ...snapshot(),
    }
    const staging = `${path}.partial`
    await writeFile(staging, `${JSON.stringify(body, null, 2)}\n`, 'utf8')
    await rename(staging, path)
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
