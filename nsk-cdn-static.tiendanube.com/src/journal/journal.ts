import type {
	AppID,
	NubeSDKRuntimeEvent,
	NubeSDKRuntimeState,
} from "@tiendanube/nube-sdk-internal-types";
import { getReplayPolicy } from "./policy";

/**
 * How many entries the rolling log keeps. It only has to cover the gap window
 * (the milliseconds between a worker's state snapshot and its live
 * subscription) plus the `all`-policy history, so a small bound is enough.
 * `sticky` entries are kept outside of it and are never evicted.
 */
const DEFAULT_MAX_ENTRIES = 100;

export type JournalEntry = {
	/** Monotonic position in the log. */
	seq: number;
	event: NubeSDKRuntimeEvent;
	sender: AppID;
	/** When set, the event was addressed to a single app. */
	target?: AppID;
	/**
	 * `state.eventPayload` as it was when the event fired. It is the only part
	 * of the state that is not cumulative — the runtime clears it on every
	 * `send` — so it has to be captured per entry. Everything else is read
	 * from the latest state at replay time.
	 */
	payload?: unknown;
};

export type EventJournal = {
	/**
	 * Records an event. Meant to be wired to a single `runtime.on("*")`
	 * subscription installed before any worker exists.
	 */
	append(
		state: Readonly<NubeSDKRuntimeState>,
		event: NubeSDKRuntimeEvent,
		sender: AppID,
		target?: AppID,
	): void;
	/** Position the next appended entry will take. */
	cursor(): number;
	/**
	 * What a worker for `appId` subscribing at `cursor` must receive before it
	 * starts consuming live events, in dispatch order.
	 *
	 * Two different guarantees are merged here:
	 *
	 * 1. **Gap replay** (`seq >= cursor`): everything dispatched between the
	 *    moment the worker's state snapshot was taken and the moment its
	 *    `runtime.on("*")` forwarder was attached. Not filtered by policy —
	 *    these events happened during the worker's own creation window and its
	 *    snapshot does not account for them, so they are delivered as
	 *    dispatched.
	 * 2. **History catch-up** (`seq < cursor`): events the app was never
	 *    present for, filtered by {@link getReplayPolicy} — the last
	 *    occurrence of each `sticky` event plus every retained `all` event.
	 */
	replayFor(appId: AppID, cursor: number): JournalEntry[];
	/**
	 * Most recent state seen by the journal. Used as the base state for
	 * replayed entries: the runtime's state is cumulative, so the newest
	 * snapshot is at least as correct as the one captured at dispatch time,
	 * and keeping one reference avoids cloning the state on every event.
	 */
	latestState(): Readonly<NubeSDKRuntimeState> | undefined;
	/** Rolling log contents, oldest first. Exposed for tests and devtools. */
	entries(): JournalEntry[];
};

function stickyKey(event: NubeSDKRuntimeEvent, target?: AppID): string {
	return `${event}::${target ?? ""}`;
}

function isForApp(entry: JournalEntry, appId: AppID): boolean {
	return entry.target === undefined || String(entry.target) === String(appId);
}

export function createEventJournal(
	maxEntries: number = DEFAULT_MAX_ENTRIES,
): EventJournal {
	// Rolling window of every event, in dispatch order. Serves the gap replay
	// (which must be exact) and the `all` history.
	let log: JournalEntry[] = [];
	// Last occurrence of each `sticky` event, kept out of the rolling window so
	// a burst of high-frequency events (`page:scroll`) can never evict the
	// lifecycle facts a late app depends on.
	const sticky = new Map<string, JournalEntry>();
	let nextSeq = 0;
	let latest: Readonly<NubeSDKRuntimeState> | undefined;

	return {
		append(state, event, sender, target) {
			latest = state;

			const entry: JournalEntry = {
				seq: nextSeq++,
				event,
				sender,
				target,
				payload: state?.eventPayload ?? undefined,
			};

			log.push(entry);
			if (log.length > maxEntries) {
				log = log.slice(log.length - maxEntries);
			}

			if (getReplayPolicy(event) === "sticky") {
				sticky.set(stickyKey(event, target), entry);
			}
		},

		cursor() {
			return nextSeq;
		},

		replayFor(appId, cursor) {
			const selected = new Map<number, JournalEntry>();

			for (const entry of sticky.values()) {
				// Entries at or past the cursor are already covered by the gap
				// replay below, which is exact.
				if (entry.seq >= cursor || !isForApp(entry, appId)) continue;
				selected.set(entry.seq, entry);
			}

			for (const entry of log) {
				if (!isForApp(entry, appId)) continue;
				// `app:register` is register-side plumbing an app cannot listen
				// to, and the announcing dispatch itself always sits inside the
				// gap: the cursor is captured while that event is still being
				// dispatched, before the journal's own `"*"` listener appends it
				// (exact listeners run before wildcards).
				if (entry.event === "app:register") continue;
				const isGap = entry.seq >= cursor;
				if (isGap || getReplayPolicy(entry.event) === "all") {
					selected.set(entry.seq, entry);
				}
			}

			return [...selected.values()].sort((a, b) => a.seq - b.seq);
		},

		latestState() {
			return latest;
		},

		entries() {
			return [...log];
		},
	};
}
