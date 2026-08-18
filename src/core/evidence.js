export class EvidenceLog {
  #events = []
  #sequence = 0

  append(type, payload = {}) {
    const event = Object.freeze({
      seq: this.#sequence++,
      type,
      ...structuredClone(payload),
    })
    this.#events.push(event)
    return event
  }

  all() {
    return structuredClone(this.#events)
  }

  ofType(type) {
    return this.#events.filter((event) => event.type === type).map((event) => structuredClone(event))
  }
}
