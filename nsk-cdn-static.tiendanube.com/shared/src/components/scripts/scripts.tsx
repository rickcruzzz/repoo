import {
	ALLOW_UNSAFE_CSS_BUNDLE_VERSION,
	ALLOW_UNSAFE_CSS_TELEMETRY_BUNDLE_VERSION,
	BUNDLE_VERSION,
	CDN,
	TELEMETRY_BUNDLE_VERSION,
} from "../../constants";

export type ScriptsProps = {
	withTelemetry?: boolean;
	/**
	 * Loads the register bundle that skips the styled-components CSS
	 * allow-list. Off by default — only turn it on where the unsafe selectors
	 * (`body`, `:root`, `:has(&)`, ...) are known to be acceptable.
	 */
	allowUnsafeCSS?: boolean;
};

// The runtime bundle has no allow-unsafe-css variant, so `allowUnsafeCSS` only
// switches the register bundle.
function getRegisterVersion(
	withTelemetry: boolean,
	allowUnsafeCSS: boolean,
): string {
	if (allowUnsafeCSS) {
		return withTelemetry
			? ALLOW_UNSAFE_CSS_TELEMETRY_BUNDLE_VERSION
			: ALLOW_UNSAFE_CSS_BUNDLE_VERSION;
	}
	return withTelemetry ? TELEMETRY_BUNDLE_VERSION : BUNDLE_VERSION;
}

export function Scripts({
	withTelemetry = false,
	allowUnsafeCSS = false,
}: ScriptsProps) {
	const runtimeVersion = withTelemetry
		? TELEMETRY_BUNDLE_VERSION
		: BUNDLE_VERSION;
	const registerVersion = getRegisterVersion(withTelemetry, allowUnsafeCSS);

	return (
		<>
			<script
				defer
				crossOrigin="anonymous"
				src={`${CDN}/nube-sdk-${runtimeVersion}.min.js`}
			/>
			<script
				defer
				crossOrigin="anonymous"
				src={`${CDN}/register-${registerVersion}.min.js`}
			/>
		</>
	);
}
