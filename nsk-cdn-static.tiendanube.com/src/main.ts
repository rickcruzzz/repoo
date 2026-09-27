import { createSDK } from "./create";
import { getDeviceInfo } from "./device-detection";
import { getRuntimeReady } from "./ready";

const stub = window.nubeSDK;

// Seed the real SDK with the storefront stub's initial state (`location`,
// store data, etc.). Note that `apps` is NOT part of it: the Bootstrap
// snippet announces apps through the `app:register` event it queues on
// `window.load`, so workers are only created when that event replays during
// the drain — the register-side event journal is what guarantees those
// workers still receive everything dispatched before they existed.
const sdk = createSDK({
	...stub?.getState?.(),
	device: getDeviceInfo(),
});

if (!stub) {
	// No bootstrap stub on the page — expose the real SDK directly. When a
	// stub does exist we leave it in place: the storefront's queuing
	// `on/off/send` must stay active during the async window between runtime
	// load and `attach()` completing. `drainStubQueue` (in attach) replays
	// the queue and swaps the stub's methods for the real ones.
	window.nubeSDK = sdk;
}

// Unblock `attach()`. Awaiting this promise from the register side guarantees
// we never capture the bootstrap stub when load order is reversed.
getRuntimeReady().resolve(sdk);
