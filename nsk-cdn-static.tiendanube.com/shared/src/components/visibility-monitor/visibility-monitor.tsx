"use client";

import type { NubeSDKRuntimeStateModifier } from "@tiendanube/nube-sdk-internal-types";
import { useEffect } from "@tiendanube/nube-sdk-react-runtime";

const EXIT_INTENT_EVENT = "page:exit_intent";
const VISIBILITY_CHANGE_EVENT = "page:visibility_change";

type DeviceType = "desktop" | "touch";

/**
 * Resolves whether the current device is primarily touch-based.
 *
 * Exit intent relies on a cursor leaving the viewport, so it only makes sense
 * on pointer devices. Visibility changes are the touch-friendly counterpart.
 */
function getDeviceType(): DeviceType {
	if (
		typeof window === "undefined" ||
		typeof window.matchMedia !== "function"
	) {
		return "desktop";
	}
	const isTouch = window.matchMedia("(hover: none), (pointer: coarse)").matches;
	return isTouch ? "touch" : "desktop";
}

/**
 * Detects that the cursor left through the top edge of the viewport — the
 * classic desktop exit-intent signal (moving toward the tab/address bar).
 */
function isTopEdgeExit(event: MouseEvent): boolean {
	// When the pointer leaves the document, `relatedTarget` is null.
	return !event.relatedTarget && event.clientY <= 0;
}

/**
 * Monitors user exit-intent signals and forwards them to the NubeSDK worker as
 * safe, serializable events. Apps run isolated in a Web Worker and cannot touch
 * `window`/`document`, so the storefront main thread observes these signals and
 * re-emits them through the SDK.
 *
 * Emitted events:
 * - `page:exit_intent` — cursor leaves through the top edge of the viewport (desktop).
 * - `page:visibility_change` — the store is hidden/backgrounded or the tab is switched (mobile/touch).
 *
 * Renders nothing — it only wires up the listeners while mounted.
 */
export function VisibilityMonitor({ hostId }: { hostId: string }) {
	useEffect(() => {
		const deviceType = getDeviceType();

		function emit(
			event: typeof EXIT_INTENT_EVENT | typeof VISIBILITY_CHANGE_EVENT,
			payload: Record<string, unknown>,
		) {
			window.nubeSDK?.send?.(hostId, event, (() => ({
				eventPayload: { deviceType, ...payload },
			})) as unknown as NubeSDKRuntimeStateModifier);
		}

		function handleVisibilityChange() {
			emit(VISIBILITY_CHANGE_EVENT, {
				source: "visibilitychange",
				visibilityState: document.visibilityState,
			});
		}

		function handleMouseOut(event: MouseEvent) {
			if (!isTopEdgeExit(event)) return;
			emit(EXIT_INTENT_EVENT, { source: "mouseout" });
		}

		document.addEventListener("visibilitychange", handleVisibilityChange);
		// Exit intent via cursor only applies to pointer devices.
		if (deviceType === "desktop") {
			document.addEventListener("mouseout", handleMouseOut);
		}

		return () => {
			document.removeEventListener("visibilitychange", handleVisibilityChange);
			document.removeEventListener("mouseout", handleMouseOut);
		};
	}, [hostId]);

	return null;
}
