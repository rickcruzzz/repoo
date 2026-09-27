import {
	type NubeSDKRuntimeEvent,
	SENDABLE_EVENT,
} from "@tiendanube/nube-sdk-internal-types";

/**
 * How an event should be re-delivered to a worker that did not exist when the
 * event was originally dispatched.
 *
 * - `never`   The event carries no information beyond the state it already
 *             merged, or it is a high-frequency/transient signal. A fresh
 *             worker boots with a full state snapshot, so replaying it would
 *             only fire a stale listener.
 * - `sticky`  A one-shot lifecycle fact ("the page has loaded", "checkout is
 *             ready"). Only the last occurrence is meaningful, and a late app
 *             must learn about it or it will wait forever.
 * - `all`     A discrete fact that is not represented in the state and is not
 *             idempotent per type (custom events, success/fail results). Every
 *             occurrence is replayed, in order, bounded by the journal size.
 *
 * The default is `sticky`: when a new event type is introduced and nobody
 * updates this table, the failure mode is at most one stale delivery instead
 * of an event silently never arriving — which is the bug class this module
 * exists to close.
 */
export type ReplayPolicy = "never" | "sticky" | "all";

/**
 * Events whose entire meaning is already in the state a new worker is seeded
 * with (state-diff events), events that are pure transient UI noise, and
 * app -> host intents. None of them benefit from a replay.
 */
const NEVER: ReadonlySet<string> = new Set<string>([
	// Register/runtime plumbing.
	"init",
	"app:register",
	"app:registered",
	"WebWorkerError",
	// State-diff events: the worker's initial snapshot already reflects them.
	"cart:update",
	"cart:before_update",
	"customer:update",
	"order:update",
	"payment:update",
	"shipping:update",
	"location:updated",
	// Transient / high-frequency signals.
	"page:scroll",
	"page:exit_intent",
	"page:visibility_change",
	"quickbuy:open",
	"quickbuy:close",
	// Intents sent by apps to the host (or to each other). Replaying another
	// app's intent into a newly booted app is never correct.
	...Object.values(SENDABLE_EVENT),
]);

/**
 * Discrete facts that are not recoverable from the state snapshot. Replayed in
 * full so an app that boots late still observes them exactly once.
 */
function isReplayAll(event: string): boolean {
	return (
		event.startsWith("custom:") ||
		event.endsWith(":success") ||
		event.endsWith(":fail")
	);
}

export function getReplayPolicy(event: NubeSDKRuntimeEvent): ReplayPolicy {
	// The event name comes from the host, so it is not worth crashing the
	// journal — and with it the runtime's whole event fan-out — over a
	// malformed one.
	if (typeof event !== "string") return "never";
	if (NEVER.has(event)) return "never";
	if (isReplayAll(event)) return "all";
	return "sticky";
}
