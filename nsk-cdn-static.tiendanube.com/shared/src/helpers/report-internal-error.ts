// General SDK-internal error reporting over a `window` event.
//
// Internal/infrastructure failures — ones the partner app can't act on and must
// NOT receive through a component's `onError` — are reported for observability
// by dispatching a general `window` CustomEvent. Each host (Core, Lightspeed, Checkout)
// listens for `NUBE_SDK_INTERNAL_ERROR_EVENT` and forwards it to Datadog (or any other monitoring service).

/** Name of the general `window` event carrying SDK-internal errors. */
export const NUBE_SDK_INTERNAL_ERROR_EVENT = "nubesdk:internal-error";

/** Payload of the {@link NUBE_SDK_INTERNAL_ERROR_EVENT} `window` event. */
export type NubeSDKInternalErrorDetail = {
	/** The subsystem/component that raised it, e.g. `"video-player"`. */
	source: string;
	/** Machine-readable code, e.g. `"engine_load_failed"`. */
	code: string;
	/** Human-readable description. */
	message: string;
};

/**
 * Report an SDK-internal error to the host via {@link NUBE_SDK_INTERNAL_ERROR_EVENT}.
 * No-op outside a browser (SSR / worker), where there is no host listener.
 */
export function reportInternalError(detail: NubeSDKInternalErrorDetail): void {
	if (typeof window === "undefined") return;
	window.dispatchEvent(
		new CustomEvent<NubeSDKInternalErrorDetail>(NUBE_SDK_INTERNAL_ERROR_EVENT, {
			detail,
		}),
	);
}
