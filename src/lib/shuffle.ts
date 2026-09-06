/** Fisher-Yates. Returns a new array; never mutates the input. */
export function shuffle<T>(items: readonly T[], rng: () => number = Math.random): T[] {
  const out = items.slice()
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

/** `count` random items without replacement. */
export function sample<T>(items: readonly T[], count: number, rng?: () => number): T[] {
  return shuffle(items, rng).slice(0, Math.max(0, count))
}
