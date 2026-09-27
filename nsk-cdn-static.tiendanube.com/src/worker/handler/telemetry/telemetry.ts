// TODO: move to @tiendanube/nube-sdk-internal-types if necessary and use `AppID` type instead of `string`

export const TelemetryEventPrefix = "telemetry:";

export function isTelemetryEvent(event: string): boolean {
	return event?.startsWith(TelemetryEventPrefix);
}

export type TelemetryEventType =
	| "telemetry:logs"
	| "telemetry:metrics"
	| "telemetry:traces";

export type TelemetryBase = {
	appId: string;
	scriptUrl: string;
	storeId: number;
	storeName: string;
	storeDomain: string;
	source:
		| "app-init"
		| "event-listener"
		| "state-modifier"
		| "internal-command"
		| "overwritten-console-log"
		| "http-fetch"
		| "http-fetch-opaque"
		| "unhandled-rejection"
		| "unhandled-error";
	startTime: number; // Unix nanoseconds
	event?: string;
};

export type TelemetryMetric = TelemetryBase & {
	type: "long-task" | "execution-time" | "long-handler";
	duration: number; // Always integer in milliseconds
};

export type TelemetryLog = TelemetryBase & {
	type: "TRACE" | "DEBUG" | "INFO" | "WARN" | "ERROR" | "FATAL";
	message?: string;
	stack?: string;
};

export type TelemetryTrace = TelemetryBase & {
	spanId: string;
	method: string;
	url: string;
	success: boolean;
	status: number;
	error?: string;
	requestId: string;
	duration: number;
};

export type Telemetry = TelemetryMetric | TelemetryLog | TelemetryTrace;

export type WorkerTelemetryMessage = {
	app: string;
	type: TelemetryEventType;
	data: Telemetry;
};
