import type { NubeSDKRuntime } from "@tiendanube/nube-sdk-internal-types";

type ReadyHandle = {
	promise: Promise<NubeSDKRuntime>;
	resolve: (sdk: NubeSDKRuntime) => void;
};

declare global {
	interface Window {
		__NUBE_SDK_RUNTIME_READY__?: ReadyHandle;
	}
}

// Coordinates the handoff between the runtime and register bundles. Either
// one may execute first (defer ordering is not always honored — dev servers,
// dynamic script injection, async tags, etc.), so whichever runs first
// creates the handle and the other side resolves or awaits it. Without this,
// `attach()` can capture the bootstrap stub instead of the real SDK and
// silently route every call into a queue that never drains.
export function getRuntimeReady(): ReadyHandle {
	const existing = window.__NUBE_SDK_RUNTIME_READY__;
	if (existing) return existing;

	let resolve!: (sdk: NubeSDKRuntime) => void;
	const promise = new Promise<NubeSDKRuntime>((r) => {
		resolve = r;
	});
	const handle: ReadyHandle = { promise, resolve };
	window.__NUBE_SDK_RUNTIME_READY__ = handle;
	return handle;
}
