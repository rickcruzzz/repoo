import { getTelemetryApiKey, getTelemetryCollectorUrl } from "./env.ts";
import type { OTelData } from "./otel-types";

interface SendTelemetryOptions {
	baseUrl?: string;
	apiKey?: string;
}

/**
 * Sends telemetry data to the OTLP endpoint using fetch with keepalive
 *
 * @param data - The telemetry data (logs, traces, or metrics)
 * @param telemetryType - The type of telemetry data (logs, traces, or metrics)
 * @param options - Configuration options including baseUrl and apiKey
 * @returns Promise with the response status
 */
export async function sendTelemetry(
	data: OTelData,
	telemetryType: string,
	options: SendTelemetryOptions = {},
): Promise<{ success: boolean; status?: number; error?: string }> {
	const {
		baseUrl = getTelemetryCollectorUrl(),
		apiKey = getTelemetryApiKey(),
	} = options;

	try {
		// Construct the endpoint URL
		const endpoint = `${baseUrl}/v1/${telemetryType}`;

		// Prepare headers
		const headers: HeadersInit = {
			"Content-Type": "application/json",
			Authorization: `Bearer ${apiKey}`,
		};

		// Serialize data with circular reference handling
		let body: string;
		try {
			body = JSON.stringify(data);
		} catch (error) {
			// Handle circular references by returning early with error
			return {
				success: false,
				error:
					"Failed to serialize telemetry data: circular reference detected",
			};
		}

		// Send the POST request with keepalive flag
		// keepalive allows the request to continue even if the page is closed
		const response = await fetch(endpoint, {
			method: "POST",
			headers,
			body,
			keepalive: true,
		});

		if (!response.ok) {
			return {
				success: false,
				status: response.status,
				error: `HTTP ${response.status}: ${response.statusText}`,
			};
		}

		return {
			success: true,
			status: response.status,
		};
	} catch (error) {
		return {
			success: false,
			error: error instanceof Error ? error.message : String(error),
		};
	}
}
