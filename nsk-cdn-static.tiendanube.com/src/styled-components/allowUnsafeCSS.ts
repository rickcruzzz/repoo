// Baked at build time by tsup (see packages/register/tsup.config.js) from the
// ALLOW_UNSAFE_CSS env var. Only the `-allow-unsafe-css*` bundles get `true`;
// the default and `-telemetry` bundles keep the unsafe-selector validation on.
declare const __ALLOW_UNSAFE_CSS__: boolean;

// typeof-guarded: the placeholder is undefined when tsup didn't bake it
// (e.g. unit tests), and a bare read of an undefined one throws ReferenceError.
export function isUnsafeCSSAllowed(): boolean {
	return typeof __ALLOW_UNSAFE_CSS__ !== "undefined"
		? __ALLOW_UNSAFE_CSS__
		: false;
}
