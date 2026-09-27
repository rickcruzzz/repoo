import { generateTraceId } from "../../../utils.ts";
import {
	getEnvironment,
	getEventListenerSlowThreshold,
	getStateModifierSlowThreshold,
	getTelemetryBatchSizeThreshold,
	getTelemetryBatchTimeThreshold,
	isTelemetryEnabled,
} from "./env.ts";
import type { OTelLogs, OTelMetrics, OTelTraces } from "./otel-types";
import { sendTelemetry } from "./send-telemetry";
import type {
	TelemetryLog,
	TelemetryMetric,
	TelemetryTrace,
	WorkerTelemetryMessage,
} from "./telemetry.ts";

/**
 * Generates a trace ID for telemetry.
 * TODO: get the traceId from the SDK if possible
 */
const getTraceId = (): string => {
	return generateTraceId();
};

// Batching buffers
const logsBuffer: OTelLogs["resourceLogs"] = [];
const metricsBuffer: OTelMetrics["resourceMetrics"] = [];
const tracesBuffer: OTelTraces["resourceSpans"] = [];

// Timer references
let logsTimer: ReturnType<typeof setTimeout> | null = null;
let metricsTimer: ReturnType<typeof setTimeout> | null = null;
let tracesTimer: ReturnType<typeof setTimeout> | null = null;

// Flush functions
const flushLogs = (): void => {
	if (logsBuffer.length === 0) return;

	const otelLogs: OTelLogs = {
		resourceLogs: [...logsBuffer],
	};

	// Fire-and-forget with error handling to avoid memory leaks from unhandled promises
	sendTelemetry(otelLogs, "logs").catch((error) => {
		console.error("Failed to send telemetry logs:", error);
	});
	logsBuffer.length = 0; // Clear buffer

	if (logsTimer) {
		clearTimeout(logsTimer);
		logsTimer = null;
	}
};

const flushMetrics = (): void => {
	if (metricsBuffer.length === 0) return;

	const otelMetrics: OTelMetrics = {
		resourceMetrics: [...metricsBuffer],
	};

	// Fire-and-forget with error handling to avoid memory leaks from unhandled promises
	sendTelemetry(otelMetrics, "metrics").catch((error) => {
		console.error("Failed to send telemetry metrics:", error);
	});
	metricsBuffer.length = 0; // Clear buffer

	if (metricsTimer) {
		clearTimeout(metricsTimer);
		metricsTimer = null;
	}
};

const flushTraces = (): void => {
	if (tracesBuffer.length === 0) return;

	const otelTraces: OTelTraces = {
		resourceSpans: [...tracesBuffer],
	};

	// Fire-and-forget with error handling to avoid memory leaks from unhandled promises
	sendTelemetry(otelTraces, "traces").catch((error) => {
		console.error("Failed to send telemetry traces:", error);
	});
	tracesBuffer.length = 0; // Clear buffer

	if (tracesTimer) {
		clearTimeout(tracesTimer);
		tracesTimer = null;
	}
};

// Schedule flush based on time threshold
const scheduleFlushLogs = (): void => {
	if (logsTimer) return; // Timer already scheduled

	logsTimer = setTimeout(() => {
		flushLogs();
	}, getTelemetryBatchTimeThreshold());
};

const scheduleFlushMetrics = (): void => {
	if (metricsTimer) return; // Timer already scheduled

	metricsTimer = setTimeout(() => {
		flushMetrics();
	}, getTelemetryBatchTimeThreshold());
};

const scheduleFlushTraces = (): void => {
	if (tracesTimer) return; // Timer already scheduled

	tracesTimer = setTimeout(() => {
		flushTraces();
	}, getTelemetryBatchTimeThreshold());
};

const handleMetric = (metric: TelemetryMetric): void => {
	const env = getEnvironment();

	// Extract the type of a single element from the resourceMetrics array
	const resourceMetric: OTelMetrics["resourceMetrics"][0] = {
		resource: {
			attributes: [
				{
					key: "service.name",
					value: { stringValue: "@tiendanube/nube-sdk-register" },
				},
			],
		},
		scopeMetrics: [
			{
				scope: {
					name: "@tiendanube/nube-sdk-register",
					version: "0.0.0",
				},
				metrics: [
					{
						name: metric.type,
						description: `A ${metric.type} observed from ${metric.source}.`,
						unit: "ms",
						gauge: {
							dataPoints: [
								{
									startTimeUnixNano: String(metric.startTime),
									timeUnixNano: String(metric.startTime),
									asDouble: Number(metric.duration),
									attributes: [
										{
											key: "environment",
											value: { stringValue: env },
										},
										{
											key: "appId",
											value: { stringValue: metric.appId },
										},
										{
											key: "storeId",
											value: { stringValue: String(metric.storeId) },
										},
										{
											key: "storeName",
											value: { stringValue: String(metric.storeName) },
										},
										{
											key: "storeDomain",
											value: { stringValue: String(metric.storeDomain) },
										},
										{
											key: "source",
											value: { stringValue: metric.source },
										},
										{
											key: "event",
											value: { stringValue: metric.event },
										},
										{
											key: "event-listener-slow-threshold",
											value: {
												stringValue: String(getEventListenerSlowThreshold()),
											},
										},
										{
											key: "state-modifier-slow-threshold",
											value: {
												stringValue: String(getStateModifierSlowThreshold()),
											},
										},
									],
								},
							],
						},
					},
				],
			},
		],
	};

	// Add to buffer
	metricsBuffer.push(resourceMetric);

	// Schedule time-based flush if not already scheduled
	scheduleFlushMetrics();

	// Check size-based flush
	if (metricsBuffer.length >= getTelemetryBatchSizeThreshold()) {
		flushMetrics();
	}
};

const handleLog = (sessionId: string, log: TelemetryLog): void => {
	const env = getEnvironment();
	const traceId = getTraceId();

	// Extract the type of a single element from the resourceLogs array
	const resourceLog: OTelLogs["resourceLogs"][0] = {
		resource: {
			attributes: [
				{
					key: "service.name",
					value: { stringValue: "@tiendanube/nube-sdk-register" },
				},
			],
		},
		scopeLogs: [
			{
				scope: {
					name: "@tiendanube/nube-sdk-register",
					version: "0.0.0",
				},
				logRecords: [
					{
						timeUnixNano: String(log.startTime),
						severityNumber: 9,
						severityText: log.type,
						body: {
							stringValue: log.message ?? "",
						},
						traceId: traceId,
						attributes: [
							{
								key: "environment",
								value: { stringValue: env },
							},
							{
								key: "appId",
								value: { stringValue: log.appId },
							},
							{
								key: "storeId",
								value: { stringValue: String(log.storeId) },
							},
							{
								key: "storeName",
								value: { stringValue: String(log.storeName) },
							},
							{
								key: "storeDomain",
								value: { stringValue: String(log.storeDomain) },
							},
							{
								key: "session.id",
								value: { stringValue: sessionId },
							},
							{
								key: "source",
								value: { stringValue: log.source },
							},
							...(log.stack !== undefined
								? [
										{
											key: "exception.message",
											value: {
												stringValue: log.message ?? "unknown error",
											},
										},
										{
											key: "exception.stacktrace",
											value: { stringValue: log.stack },
										},
									]
								: []),
						],
					},
				],
			},
		],
	};

	// Add to buffer
	logsBuffer.push(resourceLog);

	// Schedule time-based flush if not already scheduled
	scheduleFlushLogs();

	// Check size-based flush
	if (logsBuffer.length >= getTelemetryBatchSizeThreshold()) {
		flushLogs();
	}
};

export type HttpSeverity = {
	severityText: "INFO" | "WARN" | "ERROR";
	severityNumber: number;
};

export const getSeverityForTrace = (
	trace: Pick<TelemetryTrace, "status" | "success">,
): HttpSeverity => {
	// Tracking requests (sendBeacon/track/ping) complete without an HTTP status
	// code, so `success` is the only signal of whether they actually failed.
	if (!trace.status) {
		return trace.success
			? { severityText: "INFO", severityNumber: 9 }
			: { severityText: "ERROR", severityNumber: 17 };
	}
	if (trace.status >= 200 && trace.status < 300) {
		return { severityText: "INFO", severityNumber: 9 };
	}
	if (trace.status >= 300 && trace.status < 500) {
		return { severityText: "WARN", severityNumber: 13 };
	}
	return { severityText: "ERROR", severityNumber: 17 };
};

const buildFetchLogMessage = (trace: TelemetryTrace): string => {
	const durationStr = `${Math.round(trace.duration)}ms`;

	if (trace.error) {
		return `${trace.method} ${trace.url} - error: ${trace.error} (${durationStr})`;
	}
	return `${trace.method} ${trace.url} - ${trace.status} (${durationStr})`;
};

const handleTrace = (sessionId: string, trace: TelemetryTrace): void => {
	const env = getEnvironment();
	const traceId = getTraceId();

	const resourceSpan: OTelTraces["resourceSpans"][0] = {
		resource: {
			attributes: [
				{
					key: "service.name",
					value: { stringValue: "@tiendanube/nube-sdk-register" },
				},
			],
		},
		scopeSpans: [
			{
				scope: {
					name: "@tiendanube/nube-sdk-register",
					version: "0.0.0",
				},
				spans: [
					{
						traceId: traceId,
						spanId: trace.spanId,
						name: `HTTP ${trace.method} ${trace.url}`,
						kind: 3, // CLIENT
						startTimeUnixNano: String(trace.startTime),
						endTimeUnixNano: String(
							trace.startTime + trace.duration * 1_000_000,
						),
						attributes: [
							{
								key: "http.method",
								value: { stringValue: trace.method },
							},
							{
								key: "http.url",
								value: { stringValue: trace.url },
							},
							{
								key: "http.status_code",
								value: { intValue: trace.status },
							},
							{
								key: "environment",
								value: { stringValue: env },
							},
							{
								key: "appId",
								value: { stringValue: trace.appId },
							},
							{
								key: "storeId",
								value: { stringValue: String(trace.storeId) },
							},
							{
								key: "storeName",
								value: { stringValue: String(trace.storeName) },
							},
							{
								key: "storeDomain",
								value: { stringValue: String(trace.storeDomain) },
							},
							{
								key: "request.id",
								value: { stringValue: trace.requestId },
							},
							{
								key: "session.id",
								value: { stringValue: sessionId },
							},
							{
								key: "source",
								value: { stringValue: trace.source },
							},
						],
						status: {
							code: trace.success ? 1 : 2, // 1=OK, 2=ERROR
							message: trace.error || undefined,
						},
					},
				],
			},
		],
	};

	tracesBuffer.push(resourceSpan);
	scheduleFlushTraces();
	if (tracesBuffer.length >= getTelemetryBatchSizeThreshold()) {
		flushTraces();
	}

	const { severityText, severityNumber } = getSeverityForTrace(trace);

	const fetchLog: OTelLogs["resourceLogs"][0] = {
		resource: {
			attributes: [
				{
					key: "service.name",
					value: { stringValue: "@tiendanube/nube-sdk-register" },
				},
			],
		},
		scopeLogs: [
			{
				scope: {
					name: "@tiendanube/nube-sdk-register",
					version: "0.0.0",
				},
				logRecords: [
					{
						timeUnixNano: String(trace.startTime),
						severityNumber: severityNumber,
						severityText: severityText,
						body: {
							stringValue: buildFetchLogMessage(trace),
						},
						traceId: traceId,
						spanId: trace.spanId,
						attributes: [
							{
								key: "environment",
								value: { stringValue: env },
							},
							{
								key: "appId",
								value: { stringValue: trace.appId },
							},
							{
								key: "storeId",
								value: { stringValue: String(trace.storeId) },
							},
							{
								key: "storeName",
								value: { stringValue: String(trace.storeName) },
							},
							{
								key: "storeDomain",
								value: { stringValue: String(trace.storeDomain) },
							},
							{
								key: "session.id",
								value: { stringValue: sessionId },
							},
							{
								key: "http.method",
								value: { stringValue: trace.method },
							},
							{
								key: "http.url",
								value: { stringValue: trace.url },
							},
							{
								key: "http.status_code",
								value: { intValue: trace.status },
							},
							{
								key: "request.id",
								value: { stringValue: trace.requestId },
							},
							{
								key: "http.duration_ms",
								value: { doubleValue: trace.duration },
							},
							{
								key: "source",
								value: { stringValue: trace.source },
							},
						],
					},
				],
			},
		],
	};

	logsBuffer.push(fetchLog);
	scheduleFlushLogs();
	if (logsBuffer.length >= getTelemetryBatchSizeThreshold()) {
		flushLogs();
	}
};

/**
 * Routes incoming telemetry messages to the appropriate handler based on type.
 * Batches logs, metrics and traces into their respective buffers and triggers
 * flush when thresholds are hit.
 * Note: sessionId is not sent to metrics due to high cardinality concerns.
 */
export const handleTelemetry = (
	sessionId: string,
	message: WorkerTelemetryMessage,
): void => {
	// Early return if telemetry is disabled - don't buffer any data
	if (!isTelemetryEnabled()) {
		return;
	}

	switch (message.type) {
		case "telemetry:metrics":
			handleMetric(message.data as TelemetryMetric);
			break;

		case "telemetry:logs":
			handleLog(sessionId, message.data as TelemetryLog);
			break;

		case "telemetry:traces":
			handleTrace(sessionId, message.data as TelemetryTrace);
			break;

		default:
			break;
	}
};

// Export flush functions for manual flushing (e.g., before worker shutdown)
export const flushAllTelemetry = (): void => {
	// Don't flush if telemetry is disabled
	if (!isTelemetryEnabled()) {
		return;
	}

	flushLogs();
	flushMetrics();
	flushTraces();
};
