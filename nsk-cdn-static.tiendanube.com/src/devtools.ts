import type {
	NubeSDKDevtoolsEvent,
	NubeSDKDevtoolsHook,
	NubeSDKDevtoolsRecord,
	NubeSDKDevtoolsSubscriber,
} from "@tiendanube/nube-sdk-internal-types";

/**
 * How many dispatches the hook keeps. Each record holds two state snapshots,
 * so the bound is what keeps a long session (or a burst of high-frequency
 * events like `page:scroll`) from growing without limit. Enough to cover the
 * page load plus recent activity, which is what a panel opened mid-session
 * needs.
 */
const DEFAULT_MAX_RECORDS = 200;

export function createDevtoolsHook(
	maxRecords: number = DEFAULT_MAX_RECORDS,
): NubeSDKDevtoolsHook {
	let records: NubeSDKDevtoolsRecord[] = [];
	const subscribers = new Set<NubeSDKDevtoolsSubscriber>();
	let nextSeq = 0;

	function notify(
		subscriber: NubeSDKDevtoolsSubscriber,
		record: NubeSDKDevtoolsRecord,
	) {
		try {
			subscriber(record);
		} catch (error) {
			// A broken panel must never break the storefront.
			console.error("NubeSDK devtools subscriber failed:", error);
		}
	}

	return {
		emit(event: NubeSDKDevtoolsEvent) {
			const record: NubeSDKDevtoolsRecord = { ...event, seq: nextSeq++ };

			records.push(record);
			if (records.length > maxRecords) {
				records = records.slice(records.length - maxRecords);
			}

			for (const subscriber of subscribers) notify(subscriber, record);
		},

		records() {
			return [...records];
		},

		subscribe(subscriber) {
			// Replay first: a panel opened after page load gets the history and
			// the live stream through the same callback, in dispatch order.
			for (const record of records) notify(subscriber, record);

			subscribers.add(subscriber);
			return () => {
				subscribers.delete(subscriber);
			};
		},
	};
}

/**
 * Resolves the devtools hook for the current page, or `undefined` when
 * devtools is not present.
 *
 * Looked up on every dispatch instead of being cached, so a panel that
 * installs its hook late (or an extension that flips the flag after the
 * runtime bundle ran) is still picked up. Two property reads is all a store
 * without devtools ever pays.
 */
export function getDevtoolsHook(): NubeSDKDevtoolsHook | undefined {
	if (typeof window === "undefined") return undefined;

	const installed = window.__NUBE_SDK_DEVTOOLS_HOOK__;
	if (installed) return installed;

	// No hook installed by the extension: create one only when the extension
	// announced itself, so the buffer exists from the very first event even if
	// the panel connects much later.
	if (window.__NUBE_DEVTOOLS_EXTENSION__ !== true) return undefined;

	const hook = createDevtoolsHook();
	window.__NUBE_SDK_DEVTOOLS_HOOK__ = hook;
	return hook;
}
