// Cache for environment value
let cachedEnvironment: string | null = null;

// TODO: get the environment with better approach
export function getEnvironment(): string {
	if (cachedEnvironment !== null) {
		return cachedEnvironment;
	}

	const hostname = globalThis?.location?.hostname ?? "";

	if (!hostname) {
		cachedEnvironment = "unknown";
		return cachedEnvironment;
	}

	cachedEnvironment = hostname.includes("nubestaging")
		? "staging"
		: "production";
	return cachedEnvironment;
}

// TODO: Create a dedicated SDK build pipeline for staging to use environment-specific API keys
declare const __TELEMETRY_ENABLED__: boolean;
declare const __TELEMETRY_API_KEY_PRODUCTION__: string;
declare const __TELEMETRY_BASE_URL_PRODUCTION__: string;
declare const __TELEMETRY_API_KEY_STAGING__: string;
declare const __TELEMETRY_BASE_URL_STAGING__: string;
// collector-v2 rotatable keys + hosts; preferred over the above when present.
declare const __TELEMETRY_API_KEY_PRODUCTION_ROTATABLE__: string;
declare const __TELEMETRY_BASE_URL_PRODUCTION_COLLECTOR_V2__: string;
declare const __TELEMETRY_API_KEY_STAGING_ROTATABLE__: string;
declare const __TELEMETRY_BASE_URL_STAGING_COLLECTOR_V2__: string;
declare const __EVENT_LISTENER_SLOW_THRESHOLD_STAGING__: number;
declare const __EVENT_LISTENER_SLOW_THRESHOLD_PRODUCTION__: number;
declare const __STATE_MODIFIER_SLOW_THRESHOLD_STAGING__: number;
declare const __STATE_MODIFIER_SLOW_THRESHOLD_PRODUCTION__: number;
declare const __TELEMETRY_BATCH_SIZE_THRESHOLD_STAGING__: number;
declare const __TELEMETRY_BATCH_SIZE_THRESHOLD_PRODUCTION__: number;
declare const __TELEMETRY_BATCH_TIME_THRESHOLD_STAGING__: number;
declare const __TELEMETRY_BATCH_TIME_THRESHOLD_PRODUCTION__: number;

export const isTelemetryEnabled = (): boolean => {
	return typeof __TELEMETRY_ENABLED__ !== "undefined"
		? __TELEMETRY_ENABLED__
		: false;
};

// Caches for getter functions
let cachedTelemetryApiKey: string | null = null;
let cachedTelemetryCollectorUrl: string | null = null;
let cachedEventListenerSlowThreshold: number | null = null;
let cachedStateModifierSlowThreshold: number | null = null;
let cachedTelemetryBatchSizeThreshold: number | null = null;
let cachedTelemetryBatchTimeThreshold: number | null = null;

// True when the collector-v2 pair (rotatable key + v2 host) is fully configured.
// typeof-guarded: the placeholders may be undefined when tsup didn't bake them
// (e.g. unit tests), and a bare read of an undefined one throws ReferenceError.
const hasProductionCollectorV2 = (): boolean =>
	typeof __TELEMETRY_API_KEY_PRODUCTION_ROTATABLE__ !== "undefined" &&
	!!__TELEMETRY_API_KEY_PRODUCTION_ROTATABLE__ &&
	typeof __TELEMETRY_BASE_URL_PRODUCTION_COLLECTOR_V2__ !== "undefined" &&
	!!__TELEMETRY_BASE_URL_PRODUCTION_COLLECTOR_V2__;

const hasStagingCollectorV2 = (): boolean =>
	typeof __TELEMETRY_API_KEY_STAGING_ROTATABLE__ !== "undefined" &&
	!!__TELEMETRY_API_KEY_STAGING_ROTATABLE__ &&
	typeof __TELEMETRY_BASE_URL_STAGING_COLLECTOR_V2__ !== "undefined" &&
	!!__TELEMETRY_BASE_URL_STAGING_COLLECTOR_V2__;

export const getTelemetryApiKey = () => {
	if (cachedTelemetryApiKey !== null) {
		return cachedTelemetryApiKey;
	}

	if (getEnvironment() === "production") {
		// Prefer the collector-v2 rotatable key when its pair is configured.
		cachedTelemetryApiKey = hasProductionCollectorV2()
			? __TELEMETRY_API_KEY_PRODUCTION_ROTATABLE__
			: typeof __TELEMETRY_API_KEY_PRODUCTION__ !== "undefined"
				? __TELEMETRY_API_KEY_PRODUCTION__
				: "";
	} else {
		cachedTelemetryApiKey = hasStagingCollectorV2()
			? __TELEMETRY_API_KEY_STAGING_ROTATABLE__
			: typeof __TELEMETRY_API_KEY_STAGING__ !== "undefined"
				? __TELEMETRY_API_KEY_STAGING__
				: "";
	}
	return cachedTelemetryApiKey;
};

export const getTelemetryCollectorUrl = () => {
	if (cachedTelemetryCollectorUrl !== null) {
		return cachedTelemetryCollectorUrl;
	}

	if (getEnvironment() === "production") {
		// Prefer the collector-v2 host when its pair is configured.
		cachedTelemetryCollectorUrl = hasProductionCollectorV2()
			? __TELEMETRY_BASE_URL_PRODUCTION_COLLECTOR_V2__
			: typeof __TELEMETRY_BASE_URL_PRODUCTION__ !== "undefined"
				? __TELEMETRY_BASE_URL_PRODUCTION__
				: "";
	} else {
		cachedTelemetryCollectorUrl = hasStagingCollectorV2()
			? __TELEMETRY_BASE_URL_STAGING_COLLECTOR_V2__
			: typeof __TELEMETRY_BASE_URL_STAGING__ !== "undefined"
				? __TELEMETRY_BASE_URL_STAGING__
				: "";
	}
	return cachedTelemetryCollectorUrl;
};

export const getEventListenerSlowThreshold = (): number => {
	if (cachedEventListenerSlowThreshold !== null) {
		return cachedEventListenerSlowThreshold;
	}

	if (getEnvironment() === "production") {
		cachedEventListenerSlowThreshold =
			typeof __EVENT_LISTENER_SLOW_THRESHOLD_PRODUCTION__ !== "undefined"
				? __EVENT_LISTENER_SLOW_THRESHOLD_PRODUCTION__
				: 0;
	} else {
		cachedEventListenerSlowThreshold =
			typeof __EVENT_LISTENER_SLOW_THRESHOLD_STAGING__ !== "undefined"
				? __EVENT_LISTENER_SLOW_THRESHOLD_STAGING__
				: 0;
	}
	return cachedEventListenerSlowThreshold;
};

export const getStateModifierSlowThreshold = (): number => {
	if (cachedStateModifierSlowThreshold !== null) {
		return cachedStateModifierSlowThreshold;
	}

	if (getEnvironment() === "production") {
		cachedStateModifierSlowThreshold =
			typeof __STATE_MODIFIER_SLOW_THRESHOLD_PRODUCTION__ !== "undefined"
				? __STATE_MODIFIER_SLOW_THRESHOLD_PRODUCTION__
				: 0;
	} else {
		cachedStateModifierSlowThreshold =
			typeof __STATE_MODIFIER_SLOW_THRESHOLD_STAGING__ !== "undefined"
				? __STATE_MODIFIER_SLOW_THRESHOLD_STAGING__
				: 0;
	}
	return cachedStateModifierSlowThreshold;
};

export const getTelemetryBatchSizeThreshold = (): number => {
	if (cachedTelemetryBatchSizeThreshold !== null) {
		return cachedTelemetryBatchSizeThreshold;
	}

	if (getEnvironment() === "production") {
		cachedTelemetryBatchSizeThreshold =
			typeof __TELEMETRY_BATCH_SIZE_THRESHOLD_PRODUCTION__ !== "undefined"
				? __TELEMETRY_BATCH_SIZE_THRESHOLD_PRODUCTION__
				: 10;
	} else {
		cachedTelemetryBatchSizeThreshold =
			typeof __TELEMETRY_BATCH_SIZE_THRESHOLD_STAGING__ !== "undefined"
				? __TELEMETRY_BATCH_SIZE_THRESHOLD_STAGING__
				: 10;
	}
	return cachedTelemetryBatchSizeThreshold;
};

export const getTelemetryBatchTimeThreshold = (): number => {
	if (cachedTelemetryBatchTimeThreshold !== null) {
		return cachedTelemetryBatchTimeThreshold;
	}

	if (getEnvironment() === "production") {
		cachedTelemetryBatchTimeThreshold =
			typeof __TELEMETRY_BATCH_TIME_THRESHOLD_PRODUCTION__ !== "undefined"
				? __TELEMETRY_BATCH_TIME_THRESHOLD_PRODUCTION__
				: 5000;
	} else {
		cachedTelemetryBatchTimeThreshold =
			typeof __TELEMETRY_BATCH_TIME_THRESHOLD_STAGING__ !== "undefined"
				? __TELEMETRY_BATCH_TIME_THRESHOLD_STAGING__
				: 5000;
	}
	return cachedTelemetryBatchTimeThreshold;
};
