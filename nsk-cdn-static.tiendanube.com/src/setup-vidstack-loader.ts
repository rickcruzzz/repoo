// Core/vanilla loading strategy: fetch the Vidstack engine from the CDN at
// runtime (once, on first video mount) instead of bundling it into the IIFE.
// Overrides the shared default loader (which uses dynamic import — great for
// the react-adapter, but an IIFE can't code-split, so we'd otherwise inline it).
//
// Exposed as a function (not a bare side-effect import) so it survives the
// package's `"sideEffects": false` tree-shaking — `index.ts` calls it.
import {
	CDN,
	type VidstackBundle,
	setVidstackLoader,
} from "@tiendanube/nube-sdk-shared";

// Baked at build time (tsup define) — matches the published artifact filename.
declare const __VIDSTACK_ARTIFACT_VERSION__: string;

// biome-ignore lint/suspicious/noExplicitAny: runtime global from the CDN artifact
const w = globalThis as any;

let pendingPromise: Promise<VidstackBundle> | null = null;

/** Reject if the script tag never settles (e.g. network stalls with no error). */
const LOAD_TIMEOUT_MS = 15000;

function loadFromCdn(): Promise<VidstackBundle> {
	if (pendingPromise) return pendingPromise;
	pendingPromise = new Promise<VidstackBundle>((resolve, reject) => {
		// biome-ignore lint/style/useConst: assigned after `fail` closes over it.
		let timer: ReturnType<typeof setTimeout> | undefined;
		// Clearing the cache before rejecting lets a later mount retry after a
		// transient failure — a stuck rejected promise would block forever.
		const fail = (message: string) => {
			if (timer) clearTimeout(timer);
			pendingPromise = null;
			reject(new Error(message));
		};

		if (w.__NUBE_VIDSTACK__) {
			resolve(w.__NUBE_VIDSTACK__ as VidstackBundle);
			return;
		}
		if (typeof document === "undefined") {
			fail("Vidstack CDN loader needs a DOM");
			return;
		}
		const src = `${CDN}/vidstack-preact-${__VIDSTACK_ARTIFACT_VERSION__}.min.js`;
		const onReady = () => {
			if (timer) clearTimeout(timer);
			if (w.__NUBE_VIDSTACK__) {
				resolve(w.__NUBE_VIDSTACK__ as VidstackBundle);
			} else {
				fail("Vidstack artifact loaded but global is missing");
			}
		};
		timer = setTimeout(() => fail(`Timed out loading ${src}`), LOAD_TIMEOUT_MS);
		const existing = document.querySelector<HTMLScriptElement>(
			`script[src="${src}"]`,
		);
		if (existing) {
			existing.addEventListener("load", onReady);
			existing.addEventListener("error", () => fail(`Failed to load ${src}`));
			return;
		}
		const script = document.createElement("script");
		script.src = src;
		script.crossOrigin = "anonymous";
		script.onload = onReady;
		script.onerror = () => fail(`Failed to load ${src}`);
		document.head.appendChild(script);
	});
	return pendingPromise;
}

export function registerVidstackCdnLoader(): void {
	setVidstackLoader(loadFromCdn);
}
