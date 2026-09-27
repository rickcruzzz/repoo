import {
	type AppID,
	type InternalCommandRequest,
	type NubeSDKRuntime,
	type NubeSDKRuntimeEvent,
	type NubeSDKRuntimeState,
	type NubeSDKState,
	type WorkerInternalMessage,
	type WorkerMessage,
	isInternalCommandRequest,
	isInternalEvent,
} from "@tiendanube/nube-sdk-internal-types";
import type { CommandStore } from "../../command";
import { styledComponentMessageHandler } from "../../styled-components/styledComponentMessageHandler";
import { createWorkerCommandDispatcher } from "../command";
import { isTelemetryEnabled } from "../handler/telemetry/env.ts";
import {
	type WorkerTelemetryMessage,
	isTelemetryEvent,
} from "../handler/telemetry/telemetry.ts";
import {
	createWorkerInternalMessageHandler,
	createWorkerTelemetryMessageHandler,
	workerMessageHandler,
} from "../handler/worker-handler";

export function isInternalMessage(
	message: WorkerMessage | WorkerInternalMessage | WorkerTelemetryMessage,
): message is WorkerInternalMessage {
	return isInternalEvent(message.type);
}

/**
 * Sets up communication between a web worker and the main application runtime for a specific app.
 *
 * Adds a message event listener to the worker to handle incoming messages, routing them to the appropriate handler based on message type and app ID. Also subscribes to all runtime events and forwards relevant state updates to the worker, excluding private state paths.
 *
 * @param id - The app ID associated with the worker.
 * @param worker - The web worker instance to communicate with.
 * @param runtime - The runtime managing application state and events.
 * @param commandStore - The shared command store used by `window.nubeSDK.command`.
 * @param scriptUrl - The script URL of the app, used as telemetry context for command handlers.
 */
export function addWorkerEventListener(
	id: AppID,
	worker: Worker,
	runtime: NubeSDKRuntime,
	commandStore: CommandStore,
	scriptUrl: string,
) {
	const internalMessageHandler = createWorkerInternalMessageHandler(
		id,
		worker,
		{
			localStorage: localStorage,
			sessionStorage: sessionStorage,
		},
	);
	const telemetryMessageHandler = createWorkerTelemetryMessageHandler();
	const commandDispatcher = createWorkerCommandDispatcher(
		id,
		worker,
		commandStore,
		runtime,
		scriptUrl,
	);

	worker.addEventListener("message", (m: MessageEvent<string>) => {
		try {
			const message = JSON.parse(m.data) as
				| WorkerMessage
				| WorkerInternalMessage
				| WorkerTelemetryMessage
				| InternalCommandRequest;

			// Command requests bypass the `app` ownership check below: the
			// dispatcher injects `app_id` from the closure, so a worker can't
			// impersonate another app even by forging the field. Must run
			// before `isInternalMessage` because both have the `internal:`
			// prefix and would otherwise route into `internalMessageHandler`.
			if (isInternalCommandRequest(message)) {
				try {
					commandDispatcher(message);
				} catch (err) {
					console.error(`Error handling worker message: ${err}`);
				}
				return;
			}

			try {
				if (String(message.app) === String(id)) {
					if (isInternalMessage(message)) {
						internalMessageHandler(message, runtime);
					} else if (isTelemetryEvent(message.type)) {
						// Only handle telemetry messages if telemetry is enabled
						if (isTelemetryEnabled()) {
							const sessionId = runtime.getState().session?.id ?? "unknown";
							telemetryMessageHandler(
								sessionId,
								message as WorkerTelemetryMessage,
							);
						}
					} else {
						if (message.type === "ui:slot:set") {
							// process styled-components after the main handler
							styledComponentMessageHandler(message);
						}
						workerMessageHandler(message as WorkerMessage, runtime);
					}
					return;
				}
			} catch (err) {
				console.error(`Error handling worker message: ${err}`);
				return;
			}
			console.error(`App ${id} sent message with invalid id ${message.app}`);
		} catch (err) {
			console.error("Unable to parse worker app message");
		}
	});

	runtime.on("*", createWorkerStateForwarder(id, worker));
}

/**
 * Builds the function that forwards a runtime event (and the state that goes
 * with it) into a worker.
 *
 * Kept separate from {@link addWorkerEventListener} so the journal replay in
 * `attach` can deliver missed events through exactly the same serialization
 * and `postMessage` path as live events — the worker cannot tell a replayed
 * event apart from a live one, which is the point.
 *
 * @param id - The app ID that owns the worker.
 * @param worker - The web worker to forward events to.
 */
export function createWorkerStateForwarder(id: AppID, worker: Worker) {
	return (
		state: NubeSDKRuntimeState,
		event: NubeSDKRuntimeEvent,
		_senderId?: AppID,
		targetId?: AppID,
	) => {
		// `AppID` is `number | string`, and the id a worker is keyed by does not
		// always come from the same source as the one carried by the event —
		// compare them as strings, like the message handler above does.
		if (targetId !== undefined && String(targetId) !== String(id)) return;

		// Strip the worker-private paths (WORKER_PRIVATE_STATE_PATHS =
		// ["ui.slots", "config"]) plus `apps` with cheap shallow spreads
		// instead of a full deep copy. Only the top level and the `ui`
		// object are rebuilt (every other branch is shared by reference),
		// so we avoid a second full traversal of the state before
		// `JSON.stringify` — which is the only remaining full walk.
		const { apps, config, ui, ...rest } = state;

		// The cast bridges the type gap: at runtime `ui.slots`, `config`
		// and `apps` are gone, which matches the `NubeSDKState` shape.
		let stateToSend = rest as unknown as NubeSDKState;
		if (ui) {
			const { slots, ...uiWithoutSlots } = ui;
			stateToSend = {
				...rest,
				ui: uiWithoutSlots,
			} as unknown as NubeSDKState;
		}

		worker.postMessage(
			JSON.stringify({
				type: event,
				state: stateToSend,
			}),
		);
	};
}
