import {
	type AppID,
	INTERNAL_COMMAND_ERROR_CODES,
	INTERNAL_COMMAND_RESPONSE_TYPE,
	type InternalCommandError,
	type InternalCommandRequest,
	type NubeSDKRuntime,
} from "@tiendanube/nube-sdk-internal-types";
import {
	type CommandStore,
	CommandTimeoutError,
	UnknownCommandError,
} from "../../command";
import { type SendTelemetryFn, wrapInternalCommand } from "../../telemetry";
import { handleTelemetry } from "../handler/telemetry";
import type { WorkerTelemetryMessage } from "../handler/telemetry/telemetry";

export type WorkerCommandDispatcher = (request: InternalCommandRequest) => void;

/**
 * Default main-thread telemetry emitter for the command dispatcher. Bridges
 * to `handleTelemetry()` — the same entry point used when a worker posts a
 * `telemetry:*` message and `worker-event-listener` routes it.
 */
function createMainThreadSendTelemetry(
	runtime: NubeSDKRuntime,
): SendTelemetryFn {
	return (telemetry, eventType) => {
		const sessionId = runtime.getState().session?.id ?? "unknown";
		handleTelemetry(sessionId, {
			app: telemetry.appId,
			type: eventType,
			data: telemetry,
		} as WorkerTelemetryMessage);
	};
}

export type WorkerCommandDispatcherOptions = {
	/** Override the telemetry emitter — primarily for tests. */
	sendTelemetry?: SendTelemetryFn;
};

/**
 * Build a per-worker dispatcher for `internal:command:request` messages.
 *
 * Captures `appId`, `store`, `runtime` and `scriptUrl` in the closure. The
 * `app_id` carried in the response is always taken from the closure, never
 * from the worker payload — that's the security guarantee documented in
 * `worker-handler.ts` and the RFC's "App identity" section.
 *
 * Telemetry context (`storeId`, `storeName`, `storeDomain`) is read from
 * `runtime.getState()` at dispatch time so it stays current.
 */
export function createWorkerCommandDispatcher(
	appId: AppID,
	worker: Worker,
	store: CommandStore,
	runtime: NubeSDKRuntime,
	scriptUrl: string,
	options: WorkerCommandDispatcherOptions = {},
): WorkerCommandDispatcher {
	const sendTelemetry =
		options.sendTelemetry ?? createMainThreadSendTelemetry(runtime);

	function respond(
		request: InternalCommandRequest,
		payload:
			| { status: "success"; result: unknown }
			| { status: "error"; error: InternalCommandError },
	) {
		try {
			worker.postMessage(
				JSON.stringify({
					type: INTERNAL_COMMAND_RESPONSE_TYPE,
					scope: request.scope,
					command: request.command,
					app_id: appId,
					trace_id: request.trace_id,
					...payload,
				}),
			);
		} catch (err) {
			console.error(
				`[nube-sdk] Failed to post command response for "${request.scope}:${request.command}":`,
				err,
			);
		}
	}

	return (request: InternalCommandRequest) => {
		const state = runtime.getState();
		const instrumented = wrapInternalCommand(
			() =>
				store.execute(request.scope, request.command, {
					params: request.params,
					app_id: appId,
				}),
			request.scope,
			request.command,
			appId,
			scriptUrl,
			state.store?.id ?? 0,
			state.store?.name ?? "",
			state.store?.domain ?? "",
			sendTelemetry,
		);

		instrumented().then(
			(result) => respond(request, { status: "success", result }),
			(err: unknown) => {
				if (err instanceof UnknownCommandError) {
					respond(request, {
						status: "error",
						error: {
							code: INTERNAL_COMMAND_ERROR_CODES.UNKNOWN,
							message: err.message,
						},
					});
					return;
				}
				if (err instanceof CommandTimeoutError) {
					respond(request, {
						status: "error",
						error: {
							code: INTERNAL_COMMAND_ERROR_CODES.TIMEOUT,
							message: err.message,
						},
					});
					return;
				}
				respond(request, {
					status: "error",
					error: {
						code: INTERNAL_COMMAND_ERROR_CODES.FAILED,
						message: String(err),
					},
				});
			},
		);
	};
}
