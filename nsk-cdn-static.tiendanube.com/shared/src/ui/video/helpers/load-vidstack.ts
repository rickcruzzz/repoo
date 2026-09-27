"use client";

/**
 * The slice of the Vidstack engine the video component renders. Kept as a flat
 * bundle so the engine can be loaded by different strategies per host (see
 * {@link setVidstackLoader}) without the component knowing which one ran.
 *
 * Typed against `@vidstack/react`'s real exports via type-only `import(...)`
 * references — erased at build time, so they give the player real prop-typing
 * without bundling or coupling the runtime loader to Vidstack.
 */
export type VidstackBundle = {
	MediaPlayer: typeof import("@vidstack/react")["MediaPlayer"];
	MediaProvider: typeof import("@vidstack/react")["MediaProvider"];
	Poster: typeof import("@vidstack/react")["Poster"];
	DefaultVideoLayout: typeof import("@vidstack/react/player/layouts/default")["DefaultVideoLayout"];
	defaultLayoutIcons: typeof import("@vidstack/react/player/layouts/default")["defaultLayoutIcons"];
	MuteButton: typeof import("@vidstack/react")["MuteButton"];
	useMediaState: typeof import("@vidstack/react")["useMediaState"];
	/** Vidstack theme + layout CSS, injected once as a <style> by the player. */
	themeCss: string;
	videoCss: string;
};

export type VidstackLoader = () => Promise<VidstackBundle>;

/**
 * Default loader — used by the `react-adapter` (Lightspeed / Playground).
 *
 * A dynamic `import()` lets the host bundler (Next/webpack, or tsup for the
 * Playground) code-split `@vidstack/react` into an on-demand chunk: pages
 * without a video never fetch the engine, and its `localStorage`-at-import
 * stays off the SSR/critical path. CSS is imported as text (tsup
 * `loader: {".css":"text"}`) and injected by the player.
 */
const defaultLoader: VidstackLoader = async () => {
	const [core, layout, theme, video] = await Promise.all([
		import("@vidstack/react"),
		import("@vidstack/react/player/layouts/default"),
		import("@vidstack/react/player/styles/default/theme.css"),
		import("@vidstack/react/player/styles/default/layouts/video.css"),
	]);
	return {
		MediaPlayer: core.MediaPlayer,
		MediaProvider: core.MediaProvider,
		Poster: core.Poster,
		DefaultVideoLayout: layout.DefaultVideoLayout,
		defaultLayoutIcons: layout.defaultLayoutIcons,
		MuteButton: core.MuteButton,
		useMediaState: core.useMediaState,
		// With the CSS-as-text loader the module's default export is the string.
		themeCss:
			typeof (theme as { default?: unknown }).default === "string"
				? (theme as { default: string }).default
				: "",
		videoCss:
			typeof (video as { default?: unknown }).default === "string"
				? (video as { default: string }).default
				: "",
	};
};

let loader: VidstackLoader = defaultLoader;
let pending: Promise<VidstackBundle> | null = null;

/**
 * Override how the Vidstack engine is loaded. The `vanilla-adapter` (Core / CDN
 * IIFE) calls this at init to fetch the engine from the CDN at runtime instead
 * of relying on bundler code-splitting. Must be called before the first
 * `loadVidstack()`. Resets the memoized promise so the new strategy takes hold.
 */
export function setVidstackLoader(custom: VidstackLoader): void {
	loader = custom;
	pending = null;
}

/** Load the Vidstack engine once (memoized across every player on the page). */
export function loadVidstack(): Promise<VidstackBundle> {
	if (!pending) {
		// Reset the cache on failure so a later mount can retry; a rejected promise
		// would otherwise poison every subsequent caller.
		pending = loader().catch((err) => {
			pending = null;
			throw err;
		});
	}
	return pending;
}
