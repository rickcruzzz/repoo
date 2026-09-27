"use client";

import { useEffect, useState } from "@tiendanube/nube-sdk-react-runtime";
import { reportInternalError } from "../../../helpers/report-internal-error";
import { type VidstackBundle, loadVidstack } from "./load-vidstack";

/**
 * Lazy-loads the Vidstack engine once (memoized across every player on the page)
 * and injects its CSS a single time as `<style id={styleId}>`.
 *
 * The engine `themeCss` is always injected (it styles the base `.vds-*` controls
 * both callers use, e.g. the mute button). `includeLayoutCss` additionally
 * injects the default-layout stylesheet (`videoCss`), which is only needed by
 * consumers that render `<DefaultVideoLayout>` (the self-hosted `VideoPlayer`);
 * the stories player draws its own chrome and leaves it off.
 *
 * A failed engine/CDN load is an INTERNAL failure — the partner app can't act on
 * it, so it must NOT reach a component `onError`. It is reported to the host via
 * {@link reportInternalError} (forwarded to Datadog) instead. `errorSource`
 * names the subsystem in that report (e.g. `"video-player"`, `"video-stories"`).
 *
 * Shared by `VideoPlayer` and `VideoStories`; both render `MediaPlayer` from the
 * returned `bundle` (never a top-level `@vidstack/react` import) so the per-host
 * loading strategy (bundler code-split vs CDN, see {@link setVidstackLoader})
 * stays transparent to the component.
 */
export function useVidstackBundle(
	styleId: string,
	errorSource: string,
	includeLayoutCss = false,
): { bundle: VidstackBundle | null } {
	const [bundle, setBundle] = useState<VidstackBundle | null>(null);

	// Lazy-load the engine once on mount.
	useEffect(() => {
		let cancelled = false;
		loadVidstack()
			.then((mod) => {
				if (!cancelled) setBundle(mod);
			})
			.catch(() => {
				if (!cancelled) {
					reportInternalError({
						source: errorSource,
						code: "engine_load_failed",
						message: "Could not load the video engine",
					});
				}
			});
		return () => {
			cancelled = true;
		};
	}, [errorSource]);

	// Inject the engine CSS once (arrives as text via the tsup CSS loader).
	// Idempotent: guarded by the `styleId` element check.
	useEffect(() => {
		if (!bundle || typeof document === "undefined") return;

		if (document.getElementById(styleId)) return;

		const css = includeLayoutCss
			? `${bundle.themeCss}\n${bundle.videoCss}`
			: bundle.themeCss;

		if (!css) return;

		const el = document.createElement("style");
		el.id = styleId;
		el.textContent = css;
		document.head.appendChild(el);
	}, [bundle, styleId, includeLayoutCss]);

	return { bundle };
}
