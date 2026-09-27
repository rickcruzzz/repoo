/**
 * Deep-clone the runtime state via a JSON round-trip.
 *
 * The runtime state is always JSON-serializable: it is `JSON.stringify`-ed on
 * every worker `postMessage` (see `worker-event-listener.ts`), so it can never
 * legally contain `Date`, `Map`, `Set`, functions, `undefined`, `BigInt`,
 * circular refs, etc. The generic `deepcopy` package we used before paid a
 * per-node type-dispatch cost to support exactly those cases — which this
 * state never has. A JSON round-trip skips all of that and is ~11x faster for
 * plain, serializable trees (see `strip.bench.ts`).
 *
 * This is the clone used on the runtime's hot paths: `getState()` and the
 * accumulator seed inside `deepMerge()`.
 */
export function jsonClone<T>(value: T): T {
	return JSON.parse(JSON.stringify(value)) as T;
}
