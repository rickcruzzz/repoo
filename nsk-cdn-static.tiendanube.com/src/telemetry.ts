import type {
	AppID,
	NubeApp,
	NubeSDKListener,
	NubeSDKStateModifier,
} from "@tiendanube/nube-sdk-internal-types";
import {
	getEventListenerSlowThreshold,
	getStateModifierSlowThreshold,
	isTelemetryEnabled,
} from "./worker/handler/telemetry/env.ts";
import type {
	Telemetry,
	TelemetryEventType,
} from "./worker/handler/telemetry/telemetry.ts";

// TelemetryTypes types
const TELEMETRY_TYPE_LONG_TASK = "long-task";
const TELEMETRY_TYPE_EXECUTION_TIME = "execution-time";
const TELEMETRY_TYPE_LONG_HANDLER = "long-handler";

// TelemetryTypes sources
const TELEMETRY_SOURCE_APP_INIT = "app-init";
const TELEMETRY_SOURCE_EVENT_LISTENER = "event-listener";
const TELEMETRY_SOURCE_STATE_MODIFIER = "state-modifier";
const TELEMETRY_SOURCE_INTERNAL_COMMAND = "internal-command";

// Messages
const ERROR_MESSAGE_EVENT_LISTENER = "Error captured in event listener";
const ERROR_MESSAGE_STATE_MODIFIER = "Error captured in state modifier";
const ERROR_MESSAGE_INTERNAL_COMMAND = "Error captured in internal command";

export type SendTelemetryFn = (
	telemetry: Telemetry,
	telemetryEventType: TelemetryEventType,
) => void;

function normalizeDuration(duration: number): number {
	return Math.round(duration);
}

function normalizeStartTime(performanceTime: number): number {
	const absoluteTime = performance.timeOrigin + performanceTime;
	// Convert milliseconds to nanoseconds
	return Math.round(absoluteTime * 1_000_000);
}

function defaultSendTelemetry(
	telemetry: Telemetry,
	telemetryEventType: TelemetryEventType,
) {
	self.postMessage(
		JSON.stringify({
			app: telemetry.appId,
			type: telemetryEventType,
			data: telemetry,
		}),
	);
}

export function withPerformanceMonitor<AppFn extends NubeApp>(
	appFn: AppFn,
	appId: AppID,
	scriptUrl: string,
	storeId: number,
	storeName: string,
	storeDomain: string,
	sendTelemetry: SendTelemetryFn = defaultSendTelemetry,
): (...args: Parameters<AppFn>) => Promise<void> {
	return async (...args: Parameters<AppFn>) => {
		const start = performance.now();
		const longTaskObserver = new PerformanceObserver((list) => {
			for (const entry of list.getEntries()) {
				if (isTelemetryEnabled()) {
					sendTelemetry(
						{
							type: TELEMETRY_TYPE_LONG_TASK,
							appId,
							scriptUrl,
							storeId,
							storeName,
							storeDomain,
							source: TELEMETRY_SOURCE_APP_INIT,
							duration: normalizeDuration(entry.duration),
							startTime: normalizeStartTime(entry.startTime),
						},
						"telemetry:metrics",
					);
				}
			}
		});

		longTaskObserver.observe({ entryTypes: ["longtask"] });

		try {
			await appFn.apply(null, args);
			const end = performance.now();

			if (isTelemetryEnabled()) {
				sendTelemetry(
					{
						type: TELEMETRY_TYPE_EXECUTION_TIME,
						appId,
						scriptUrl,
						storeId,
						storeName,
						storeDomain,
						source: TELEMETRY_SOURCE_APP_INIT,
						duration: normalizeDuration(end - start),
						startTime: normalizeStartTime(start),
					},
					"telemetry:metrics",
				);
			}
		} catch (err) {
			const error = err instanceof Error ? err : new Error(String(err));
			if (isTelemetryEnabled()) {
				sendTelemetry(
					{
						type: "ERROR",
						appId,
						scriptUrl,
						storeId,
						storeName,
						storeDomain,
						source: TELEMETRY_SOURCE_APP_INIT,
						message: error.message,
						stack: error.stack,
						startTime: normalizeStartTime(start),
					},
					"telemetry:logs",
				);
			}
			throw err;
		} finally {
			longTaskObserver.disconnect();
		}
	};
}

export function wrapEventListener(
	listener: NubeSDKListener,
	appId: AppID,
	scriptUrl: string,
	storeId: number,
	storeName: string,
	storeDomain: string,
	sendTelemetry: SendTelemetryFn = defaultSendTelemetry,
): NubeSDKListener {
	return (state, event) => {
		const start = performance.now();
		try {
			return listener(state, event);
		} catch (err) {
			// Safely capture event listener errors
			const error = err instanceof Error ? err : new Error(String(err));
			if (isTelemetryEnabled()) {
				sendTelemetry(
					{
						type: "ERROR",
						appId,
						storeId,
						storeName,
						storeDomain,
						source: TELEMETRY_SOURCE_EVENT_LISTENER,
						event,
						message: error.message,
						stack: error.stack,
						startTime: normalizeStartTime(start),
						scriptUrl,
					},
					"telemetry:logs",
				);
			}

			// Error log for debugging without breaking execution
			console.error(`${ERROR_MESSAGE_EVENT_LISTENER} '${event}':`, error);

			// Do NOT re-throw error to maintain safe execution
			return undefined;
		} finally {
			const duration = normalizeDuration(performance.now() - start);
			if (isTelemetryEnabled() && duration > getEventListenerSlowThreshold()) {
				// Only report slow handlers (>50ms)
				sendTelemetry(
					{
						type: TELEMETRY_TYPE_LONG_HANDLER,
						source: TELEMETRY_SOURCE_EVENT_LISTENER,
						event,
						duration,
						startTime: normalizeStartTime(start),
						appId,
						scriptUrl,
						storeId,
						storeName,
						storeDomain,
					},
					"telemetry:metrics",
				);
			}
		}
	};
}

export function wrapStateModifier(
	modifier: NubeSDKStateModifier,
	event: string,
	appId: AppID,
	scriptUrl: string,
	storeId: number,
	storeName: string,
	storeDomain: string,
	sendTelemetry: SendTelemetryFn = defaultSendTelemetry,
): NubeSDKStateModifier {
	return (state) => {
		const start = performance.now();
		try {
			return modifier(state);
		} catch (err) {
			const error = err instanceof Error ? err : new Error(String(err));
			if (isTelemetryEnabled()) {
				sendTelemetry(
					{
						type: "ERROR",
						source: TELEMETRY_SOURCE_STATE_MODIFIER,
						event,
						message: error.message,
						stack: error.stack,
						startTime: normalizeStartTime(start),
						appId,
						scriptUrl,
						storeId,
						storeName,
						storeDomain,
					},
					"telemetry:logs",
				);
			}

			console.error(`${ERROR_MESSAGE_STATE_MODIFIER} '${event}':`, error);

			return {};
		} finally {
			const duration = normalizeDuration(performance.now() - start);
			if (isTelemetryEnabled() && duration > getStateModifierSlowThreshold()) {
				sendTelemetry(
					{
						type: TELEMETRY_TYPE_LONG_HANDLER,
						source: TELEMETRY_SOURCE_STATE_MODIFIER,
						event,
						duration,
						startTime: normalizeStartTime(start),
						appId,
						scriptUrl,
						storeId,
						storeName,
						storeDomain,
					},
					"telemetry:metrics",
				);
			}
		}
	};
}

/**
 * Instrument a command execution closure with telemetry. Pure instrumentation —
 * the closure is responsible for the actual invocation mechanics (lookup,
 * sync/async normalization, timeout race); this wrapper just measures it.
 *
 * - Measures execution duration.
 * - On error, reports a `telemetry:logs` ERROR (including `CommandTimeoutError`
 *   from the underlying `execute`, since slow/failed dispatches are real
 *   operational signal).
 * - On slow execution (`> getEventListenerSlowThreshold()`), reports a
 *   `telemetry:metrics` `long-handler`.
 * - **Re-throws** the original error so the dispatcher can map it to the
 *   right wire response code.
 *
 * `sendTelemetry` is required: the wrapper runs on the main thread where the
 * worker-side `defaultSendTelemetry` (which posts to `self.postMessage`)
 * would not reach the pipeline. Callers bridge to `handleTelemetry()`.
 */
export function wrapInternalCommand(
	executor: () => Promise<unknown>,
	scope: string,
	command: string,
	appId: AppID,
	scriptUrl: string,
	storeId: number,
	storeName: string,
	storeDomain: string,
	sendTelemetry: SendTelemetryFn,
): () => Promise<unknown> {
	const event = `${scope}:${command}`;

	return async () => {
		const start = performance.now();
		try {
			return await executor();
		} catch (err) {
			const error = err instanceof Error ? err : new Error(String(err));
			if (isTelemetryEnabled()) {
				sendTelemetry(
					{
						type: "ERROR",
						source: TELEMETRY_SOURCE_INTERNAL_COMMAND,
						event,
						message: error.message,
						stack: error.stack,
						startTime: normalizeStartTime(start),
						appId,
						scriptUrl,
						storeId,
						storeName,
						storeDomain,
					},
					"telemetry:logs",
				);
			}

			console.error(`${ERROR_MESSAGE_INTERNAL_COMMAND} '${event}':`, error);

			throw err;
		} finally {
			const duration = normalizeDuration(performance.now() - start);
			if (isTelemetryEnabled() && duration > getEventListenerSlowThreshold()) {
				sendTelemetry(
					{
						type: TELEMETRY_TYPE_LONG_HANDLER,
						source: TELEMETRY_SOURCE_INTERNAL_COMMAND,
						event,
						duration,
						startTime: normalizeStartTime(start),
						appId,
						scriptUrl,
						storeId,
						storeName,
						storeDomain,
					},
					"telemetry:metrics",
				);
			}
		}
	};
}
