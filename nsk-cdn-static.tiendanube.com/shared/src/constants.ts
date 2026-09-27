declare const __NUBE_SDK_CDN_URL__: string | undefined;
declare const __CDN_BUNDLE_VERSION__: string;

export const CDN =
	typeof __NUBE_SDK_CDN_URL__ !== "undefined" && __NUBE_SDK_CDN_URL__
		? __NUBE_SDK_CDN_URL__
		: "https://nsk-cdn-static.tiendanube.com";

export const BUNDLE_VERSION =
	typeof __CDN_BUNDLE_VERSION__ !== "undefined" && __CDN_BUNDLE_VERSION__
		? __CDN_BUNDLE_VERSION__
		: "0.47.0";

export const TELEMETRY_BUNDLE_VERSION = `${BUNDLE_VERSION}-telemetry`;

// Register-only variants: the register bundle is the one that validates styled
// CSS, so only it ships an "unsafe CSS allowed" build (see
// packages/register/tsup.config.js).
export const ALLOW_UNSAFE_CSS_BUNDLE_VERSION = `${BUNDLE_VERSION}-allow-unsafe-css`;

export const ALLOW_UNSAFE_CSS_TELEMETRY_BUNDLE_VERSION = `${BUNDLE_VERSION}-allow-unsafe-css-telemetry`;
