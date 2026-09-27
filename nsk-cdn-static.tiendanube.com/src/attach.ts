import type {
	AppState,
	NubeSDKRuntime,
	NubeSDKRuntimeState,
	NubeSDKStubQueueEntry,
} from "@tiendanube/nube-sdk-internal-types";
import { getRuntimeReady } from "../../runtime/src/ready";
import {
	getAppInitializer,
	serializeAppData,
	serializeInitialState,
} from "./code-handler";
import { type CommandStore, createCommandStore } from "./command";
import { registerCustomizationCommands } from "./customization";
import { type EventJournal, createEventJournal } from "./journal";
import {
	addWorkerEventListener,
	createWorkerStateForwarder,
} from "./worker/event-listener";
import { createWorker } from "./worker/handler";
import { flushAllTelemetry } from "./worker/handler/telemetry";
import { isTelemetryEnabled } from "./worker/handler/telemetry/env";

const NUBE_DEVTOOLS_APPLICATION_SERVER_KEY = "nube-devtools-application-server";

type DevtoolsServerData = {
	script: string;
	connected: boolean;
	appId: string;
	type: "existing" | "new";
};

function isDevtoolsEnabled(): boolean {
	return window.__NUBE_DEVTOOLS_EXTENSION__ === true;
}

function mergeDevtoolsApp(state: NubeSDKRuntimeState): NubeSDKRuntimeState {
	let data: DevtoolsServerData | null = null;
	try {
		const raw = sessionStorage.getItem(NUBE_DEVTOOLS_APPLICATION_SERVER_KEY);
		if (raw) data = JSON.parse(raw) as DevtoolsServerData;
	} catch (error) {
		console.error("Failed to load devtools application data:", error);
	}
	if (!data?.connected || !data?.appId || !data?.script) return state;

	if (data.type === "existing") {
		const existingApp = state.apps?.[data.appId];
		if (!existingApp) return state;

		return {
			...state,
			apps: {
				...state.apps,
				[data.appId]: { ...existingApp, script: data.script },
			},
		};
	}

	return {
		...state,
		apps: {
			...state.apps,
			[data.appId]: { id: data.appId, script: data.script },
		},
	};
}

const registeredWorkers = new Set<string>();

export function _resetRegisteredWorkers() {
	registeredWorkers.clear();
	attached = false;
}

/**
 * Delivers to a freshly created worker every event it should have received but
 * could not, because it had no channel at the time: the events dispatched
 * during its own creation window, plus the lifecycle facts that happened
 * before the app was even announced.
 *
 * Replay goes through the same forwarder as live events, so the worker (and
 * the partner app inside it) cannot tell the two apart.
 */
function replayJournal(
	appId: string,
	worker: Worker,
	journal: EventJournal,
	cursor: number,
) {
	const missed = journal.replayFor(appId, cursor);
	if (missed.length === 0) return;

	const baseState = journal.latestState();
	if (!baseState) return;

	const forward = createWorkerStateForwarder(appId, worker);

	for (const entry of missed) {
		// The state is cumulative, so the newest snapshot is used as the base
		// and only `eventPayload` — the one field the runtime resets on every
		// `send` — is restored from the entry.
		forward(
			{ ...baseState, eventPayload: entry.payload } as NubeSDKRuntimeState,
			entry.event,
			entry.sender,
			entry.target,
		);
	}
}

function register(
	runtime: NubeSDKRuntime,
	state: NubeSDKRuntimeState,
	initializer: string,
	commandStore: CommandStore,
	journal: EventJournal,
	/**
	 * Journal position at the moment these apps were announced, which can be
	 * well before this call runs (the `app:register` handler awaits the
	 * initializer fetch). Everything dispatched from that position on is
	 * replayed verbatim, so an app announced by the host never misses an event
	 * just because its worker was not born yet.
	 */
	announcedCursor?: number,
) {
	window.__NUBE_SDK_APPS__ = window.__NUBE_SDK_APPS__ || [];
	const { apps } = state;
	const registered: Record<string, AppState> = {};

	for (const appId in apps) {
		const app = apps[appId] as AppState;
		if (app && !app.registered && !registeredWorkers.has(appId)) {
			registeredWorkers.add(appId);

			// Falls back to "now", taken before the worker is created so the
			// state snapshot baked into it and the cursor describe the same
			// point in the event stream: nothing between them can be lost or
			// delivered twice.
			const cursor = announcedCursor ?? journal.cursor();

			const worker = createWorker(
				serializeAppData(app),
				serializeInitialState(state),
				initializer,
			);

			addWorkerEventListener(appId, worker, runtime, commandStore, app.script);

			// From here on the worker is subscribed to live events. Everything
			// that happened up to this point is the journal's job.
			replayJournal(appId, worker, journal, cursor);

			app.registered = true;
			registered[appId] = app;
			window.__NUBE_SDK_APPS__.push({ id: appId, worker });
		}
	}

	if (Object.keys(registered).length > 0) {
		runtime.send("register", "app:registered", () => ({
			apps: registered,
		}));
	}
}

let attached = false;
let beforeunloadListenerAdded = false;

function drainStubQueue(sdk: NubeSDKRuntime) {
	const stub = window.nubeSDK;
	if (!stub || stub === sdk) return;

	const queue = Array.isArray(stub.queue) ? stub.queue : undefined;

	// Swap the stub's methods for the real SDK's BEFORE replaying. Replaying
	// dispatches events synchronously, and host listeners react by rendering
	// (checkout runs React 17, where a `setState` from outside a React event
	// renders inline). Those components read `window.nubeSDK` again, so the
	// stub must already be the real SDK by the time the first entry replays —
	// otherwise they hit the stub's queuing methods while the queue is gone.
	// Also keeps any consumer that captured `window.nubeSDK` before the drain
	// (e.g. via a hook closure) working.
	Object.assign(stub, sdk);

	if (queue) {
		// Forwarding sink instead of `undefined`: a stub *method* captured
		// before the drain still closes over `sdk.queue`, so leaving it unset
		// makes that call throw. Forwarding straight to the runtime keeps it
		// working and prevents the call from being silently dropped into a
		// queue nobody drains again.
		stub.queue = {
			push: ([method, ...args]: NubeSDKStubQueueEntry) =>
				Reflect.apply(sdk[method as "on" | "off" | "send"], sdk, args),
		};

		// Sort `on` entries to the front so a listener registered before a
		// send actually receives that send when replayed.
		queue.sort((a, b) => {
			if (a[0] === "on" && b[0] !== "on") return -1;
			if (a[0] !== "on" && b[0] === "on") return 1;
			return 0;
		});
		for (const [method, ...args] of queue) {
			Reflect.apply(sdk[method as "on" | "off" | "send"], sdk, args);
		}
	}
}

export async function attach(nube?: NubeSDKRuntime) {
	if (attached) return;
	attached = true;

	const initializerPromise = getAppInitializer();

	// Wait for the real runtime SDK to be available before wiring anything
	// up. If the register bundle ran before the runtime bundle, the only
	// thing on `window.nubeSDK` is the bootstrap stub — calling `on(...)` on
	// it would push our registration into a queue with no one to drain it.
	// `nube` is honored when provided so unit tests can inject a runtime
	// directly.
	const sdk = nube ?? (await getRuntimeReady().promise);

	// Command store: created here so it can later be shared with the
	// per-worker dispatcher. Assigned before `drainStubQueue` so the stub on
	// `window.nubeSDK` carries it via `Object.assign`. The runtime sees only
	// the `NubeSDKCommand` shape (`add`); the dispatcher uses `commandStore`
	// directly to call `get`.
	const commandStore = createCommandStore();
	sdk.command = commandStore;

	// Event journal: the single source of truth for "what has already been
	// dispatched". Subscribed here, before `app:register` and before
	// `drainStubQueue`, so it observes the whole event stream — including the
	// events the bootstrap stub queued while the runtime was still loading —
	// and can hand a newly created worker whatever it missed.
	//
	// It lives on the register side on purpose: the runtime and register
	// bundles are versioned and deployed independently, so keeping the journal
	// here means no version skew between them.
	const journal = createEventJournal();
	sdk.on("*", (state, event, sender, target) => {
		journal.append(state, event, sender, target);
	});

	sdk.on("app:register", async (payload) => {
		// The apps in this payload are known from *now*, even though their
		// workers only exist after the awaits below. Marking the position here
		// is what turns the initializer fetch from an event-dropping race into
		// plain latency: `register` replays everything from this cursor on.
		const announcedCursor = journal.cursor();
		const initializer = await initializerPromise;
		const nextState = isDevtoolsEnabled() ? mergeDevtoolsApp(payload) : payload;
		register(
			sdk,
			nextState,
			initializer,
			commandStore,
			journal,
			announcedCursor,
		);
	});

	// Customization API: the first `nube.api` integration handled by the SDK
	// itself rather than by the host, since what it adapts is the host's DOM.
	// Registered here so it is available on every host that loads this bundle,
	// with no host-side wiring. Ordering is not critical — it only has to
	// precede the first `register()` call below, which is what lets a worker
	// dispatch commands.
	registerCustomizationCommands(commandStore);

	const initializer = await initializerPromise;

	const rawState = sdk.getState();
	const state = isDevtoolsEnabled() ? mergeDevtoolsApp(rawState) : rawState;
	const hasApps = state?.apps && Object.keys(state.apps).length > 0;

	// In the standard flow `state.apps` is empty here: the Bootstrap stub's
	// `getState` carries only the initial state, and apps are announced by the
	// `app:register` event it queues on `window.load` — handled above, with the
	// journal covering anything dispatched before those workers exist. This
	// eager path only fires when something seeded `apps` into the state
	// directly (e.g. `mergeDevtoolsApp`).
	if (hasApps) register(sdk, state, initializer, commandStore, journal);
	drainStubQueue(sdk);

	// Set up a listener to flush telemetry before the page unloads
	// This ensures any buffered telemetry data is sent before the user navigates away
	// Only add the listener if telemetry is enabled
	if (!beforeunloadListenerAdded && isTelemetryEnabled()) {
		window.addEventListener("beforeunload", () => {
			flushAllTelemetry();
		});
		beforeunloadListenerAdded = true;
	}
}
