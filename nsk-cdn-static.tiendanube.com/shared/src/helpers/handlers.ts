import type {
	DeepPartial,
	NubeSDKRuntimeEvent,
	NubeSDKRuntimeStateModifier,
} from "@tiendanube/nube-sdk-internal-types";
import type { ChangeEvent, Dispatch, FocusEvent, SetStateAction } from "react";

type HTMLElement = HTMLInputElement | HTMLTextAreaElement;

export function handleModifier({ __internalId }: { __internalId: string }) {
	return (event: ChangeEvent<HTMLElement> | FocusEvent<HTMLElement>) => ({
		ui: {
			values: {
				[__internalId]: event.target.value,
			},
		},
	});
}

export function handleChange<T extends string | number | boolean>(
	send: (
		eventName: NubeSDKRuntimeEvent,
		modifier?: NubeSDKRuntimeStateModifier,
	) => void,
	prefix: string,
	handler: (
		event: ChangeEvent<HTMLElement>,
	) => DeepPartial<NubeSDKRuntimeStateModifier>,
	setValue: Dispatch<SetStateAction<T>>,
	shouldSend: boolean,
) {
	return (event: ChangeEvent<HTMLElement>) => {
		setValue(event.target.value as T);
		if (shouldSend) {
			send(`${prefix}:change` as NubeSDKRuntimeEvent, () => handler(event));
		}
	};
}

export function handleBlur(
	send: (
		eventName: NubeSDKRuntimeEvent,
		modifier?: NubeSDKRuntimeStateModifier,
	) => void,
	prefix: string,
	handler: (
		event: ChangeEvent<HTMLElement>,
	) => DeepPartial<NubeSDKRuntimeStateModifier>,
) {
	return (event: FocusEvent<HTMLElement>) =>
		send(`${prefix}:blur` as NubeSDKRuntimeEvent, () => handler(event));
}

export function handleFocus(
	send: (
		eventName: NubeSDKRuntimeEvent,
		modifier?: NubeSDKRuntimeStateModifier,
	) => void,
	prefix: string,
	handler: (
		event: ChangeEvent<HTMLElement>,
	) => DeepPartial<NubeSDKRuntimeStateModifier>,
) {
	return (event: FocusEvent<HTMLElement>) =>
		send(`${prefix}:focus` as NubeSDKRuntimeEvent, () => handler(event));
}

/**
 * Creates a message event handler for iframe postMessage communication.
 * Validates that the message originates from the specific iframe and sends
 * the event to the SDK runtime.
 *
 * @param send - Function to send events to the SDK runtime
 * @param prefix - Event prefix (e.g., "custom:iframe:${__internalId}")
 * @param __internalId - Internal ID of the iframe component
 * @param getIframeRef - Function that returns the current iframe element reference
 * @param expectedOrigin - Optional origin to validate against for security
 * @param dataAppId - Optional app ID attribute to validate message source
 * @param onMessage - Optional callback to process message before sending
 * @returns Message event handler function
 */
export function handleMessage(
	send: (
		eventName: NubeSDKRuntimeEvent,
		modifier?: NubeSDKRuntimeStateModifier,
	) => void,
	prefix: string,
	__internalId: string,
	getIframeRef: () => HTMLIFrameElement | null,
	expectedOrigin?: string,
	dataAppId?: string,
	onMessage?: (data: unknown) => void,
) {
	return (event: MessageEvent) => {
		if (expectedOrigin && event.origin !== expectedOrigin) {
			console.warn("Error handling message event: Origin mismatch", {
				expected: expectedOrigin,
				got: event.origin,
			});
			return;
		}

		const iframeRef = getIframeRef();
		if (!iframeRef) {
			console.warn("Error handling message event: Iframe reference not found");
			return;
		}

		if (event.source !== iframeRef.contentWindow) {
			console.warn("Error handling message event: Source mismatch", {
				expected: iframeRef.contentWindow,
				got: event.source,
			});
			return;
		}

		const iframeId = iframeRef.getAttribute("id");
		if (iframeId !== __internalId) {
			console.warn("Error handling message event: Iframe ID mismatch", {
				expected: __internalId,
				got: iframeId,
			});
			return;
		}

		if (dataAppId) {
			const appId = iframeRef.getAttribute("data-app-id");
			if (appId !== dataAppId) {
				console.warn("Error handling message event: App ID mismatch", {
					expected: dataAppId,
					got: appId,
				});
				return;
			}
		}

		if (onMessage) {
			onMessage(event.data);
		}

		send(`${prefix}:message` as NubeSDKRuntimeEvent, () => ({
			ui: {
				values: {
					[__internalId]: event.data,
				},
			},
		}));
	};
}
