"use client";

import type { NubeSDKRuntimeStateModifier } from "@tiendanube/nube-sdk-internal-types";
import { useEffect } from "@tiendanube/nube-sdk-react-runtime";

const SCROLL_EVENT = "page:scroll";

/**
 * Size (in percent) of each scroll-depth bucket. The event is sent every time
 * the reader crosses a new bucket boundary. Adjust to change the granularity.
 */
const SCROLL_DEPTH_STEP = 10;

/**
 * Tracks the vertical scroll depth of the page and sends a `page:scroll`
 * event whenever the reader crosses a new depth bucket of `SCROLL_DEPTH_STEP`
 * percent (e.g. 10, 20, ..., 100). Renders nothing.
 */
export function ScrollTracker({ hostId }: { hostId: string }) {
	useEffect(() => {
		let lastScrollDepth = 0;

		const handleScroll = () => {
			const scrollTop = window.scrollY || document.documentElement.scrollTop;
			const scrollableHeight =
				document.documentElement.scrollHeight - window.innerHeight;

			if (scrollableHeight <= 0) return;

			const scrollPercent = (scrollTop / scrollableHeight) * 100;
			const depth = Math.min(
				100,
				Math.max(
					0,
					Math.floor(scrollPercent / SCROLL_DEPTH_STEP) * SCROLL_DEPTH_STEP,
				),
			);

			if (depth === lastScrollDepth) return;
			lastScrollDepth = depth;

			window.nubeSDK?.send?.(hostId, SCROLL_EVENT, () => ({
				eventPayload: {
					scrollY: scrollTop,
					scrollHeight: document.documentElement.scrollHeight,
					viewportHeight: window.innerHeight,
					scrollPercentage: lastScrollDepth,
				},
			}));
		};

		// `passive: true`: the handler never calls preventDefault, so this lets
		// the browser scroll without waiting on it, avoiding scroll jank.
		document.addEventListener("scroll", handleScroll, { passive: true });
		return () => document.removeEventListener("scroll", handleScroll);
	}, []);

	return null;
}
