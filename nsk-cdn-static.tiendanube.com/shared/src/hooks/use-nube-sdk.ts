"use client";
import type {
	AppID,
	NubeSDKListenableEvent,
	NubeSDKRuntime,
	NubeSDKRuntimeEvent,
	NubeSDKRuntimeListener,
	NubeSDKRuntimeState,
	NubeSDKRuntimeStateModifier,
} from "@tiendanube/nube-sdk-internal-types";
import {
	useCallback,
	useEffect,
	useState,
} from "@tiendanube/nube-sdk-react-runtime";

function getNubeSDK(): NubeSDKRuntime | null {
	// Proteção para SSR - retorna null no servidor
	if (typeof window === "undefined") {
		return null;
	}

	if ("nubeSDK" in window && typeof window.nubeSDK?.getState === "function") {
		return window.nubeSDK as NubeSDKRuntime;
	}

	return null;
}

/**
 * Hook to consume the NubeSDK instance in the host application (checkout or storefront).
 * Compatible with both React and Preact.
 *
 * It provides:
 * - The current synchronized application state (via `state`)
 * - Methods to send (`send`) and listen to events (`on`, `off`) from the SDK
 *
 * Reactivity:
 * - If `listen` **is not provided**, the hook will listen to the generic `"*"` event and react to any state change.
 * - If `listen` **is specified**, the hook will **only update** the state when those events are emitted.
 *
 * @param appid - Application ID (used internally to send events with correct origin)
 * @param listen - Specific SDK event(s) that the hook should listen to for state updates
 *
 * @returns An object with:
 * - `state`: Current SDK state
 * - `send`: Function to send events
 * - `on`: Register additional listeners
 * - `off`: Remove previously registered listeners
 */
export function useNubeSDK(
	appid: string,
	listen?: NubeSDKRuntimeEvent | NubeSDKRuntimeEvent[],
) {
	const [sdk, setSdk] = useState<NubeSDKRuntime | null>(null);
	const [state, setState] = useState<NubeSDKRuntimeState | null>(null);

	// Inicializar SDK apenas no cliente
	useEffect(() => {
		const nubeSDK = getNubeSDK();
		if (nubeSDK) {
			setSdk(nubeSDK);
			setState(nubeSDK.getState());
		}
	}, []);

	useEffect(() => {
		if (!sdk) return;

		const updateState = (next: NubeSDKRuntimeState) => setState(next);

		// If no listener is specified, we listen to all generic changes
		if (!listen) {
			sdk.on("*", updateState);
			return () => sdk.off("*", updateState);
		}

		// If there are specific listeners defined
		if (Array.isArray(listen)) {
			for (const evt of listen) sdk.on(evt, updateState);
			return () => {
				for (const evt of listen) sdk.off(evt, updateState);
			};
		}

		sdk.on(listen, updateState);
		return () => sdk.off(listen, updateState);
	}, [listen, sdk]);

	const send = useCallback(
		(
			event: NubeSDKRuntimeEvent,
			modifier?: NubeSDKRuntimeStateModifier,
			target?: AppID,
		) => {
			if (sdk) {
				sdk.send(appid, event, modifier, target);
			}
		},
		[appid, sdk],
	);

	const on = useCallback(
		(event: NubeSDKRuntimeEvent, listener: NubeSDKRuntimeListener) => {
			if (sdk) {
				sdk.on(event, listener);
			}
		},
		[sdk],
	);

	const off = useCallback(
		(event: NubeSDKListenableEvent, listener: NubeSDKRuntimeListener) => {
			if (sdk) {
				sdk.off(event, listener);
			}
		},
		[sdk],
	);

	return { state, send, on, off };
}
