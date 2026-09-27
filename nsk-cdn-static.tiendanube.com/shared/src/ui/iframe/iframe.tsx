"use client";

import type { NubeSDKRuntimeEvent } from "@tiendanube/nube-sdk-internal-types";
import { useEffect, useRef } from "@tiendanube/nube-sdk-react-runtime";
import type { IframeHTMLAttributes } from "react";
import { useNubeSDK } from "../../hooks/use-nube-sdk";

export type IframeProps = IframeHTMLAttributes<HTMLIFrameElement> & {
	sandbox?: string;
	__internalId?: string;
	onMessage?: boolean;
	autoresize?: boolean;
};

/**
 * List of allowed sandbox tokens for iframe security.
 *
 * Blocked tokens (not included for security reasons):
 * - 'allow-top-navigation': Allows unrestricted navigation to parent context (security risk)
 * - 'allow-orientation-lock': Allows content to lock screen orientation
 * - 'allow-top-navigation-to-custom-protocols': Allows navigation to custom protocols in top-level context
 */
const allowedSandboxTokens = [
	"allow-forms",
	"allow-scripts",
	"allow-same-origin",
	"allow-popups",
	"allow-pointer-lock",
	"allow-popups-to-escape-sandbox",
	"allow-presentation",
	"allow-top-navigation-by-user-activation",
	"allow-downloads-without-user-activation",
	"allow-downloads",
	"allow-modals",
	"allow-storage-access-by-user-activation",
] as const;

type AllowedSandboxToken = (typeof allowedSandboxTokens)[number];

function validateSandboxTokens(sandbox: string): string {
	if (!sandbox || typeof sandbox !== "string") {
		return "";
	}

	const tokens = sandbox.split(/\s+/).filter(Boolean);
	const valid = tokens.filter((t) =>
		allowedSandboxTokens.includes(t as AllowedSandboxToken),
	);

	return valid.join(" ");
}

type IframeMessageResizeMessage = {
	type: "resize";
	height?: number;
	width?: number;
};

function isIframeMessageResizeMessage(
	message: unknown,
): message is IframeMessageResizeMessage {
	return (
		typeof message === "object" &&
		message !== null &&
		"type" in message &&
		message.type === "resize"
	);
}

function applyIframeMessageResizeMessage(
	element: HTMLIFrameElement,
	message: IframeMessageResizeMessage,
) {
	if (message.height) {
		element.style.height = `${message.height}px`;
	}
	if (message.width) {
		element.style.width = `${message.width}px`;
	}
}

/**
 * Iframe component with type-safe sandbox attribute.
 * Provides a secure wrapper around HTML iframe element with explicit sandbox controls.
 * Automatically filters out any sandbox tokens that are not in the allowed list.
 */
export function Iframe({
	sandbox,
	__internalId,
	onMessage,
	autoresize = false,
	...props
}: IframeProps) {
	const { send } = useNubeSDK("storefront");
	const sandboxAttribute = sandbox ? validateSandboxTokens(sandbox) : undefined;
	const iframeRef = useRef<HTMLIFrameElement>(null);
	const shouldListenForMessages = __internalId && (onMessage || autoresize);

	useEffect(() => {
		if (!shouldListenForMessages) return;

		const prefix = `custom:iframe:${__internalId}`;
		const handleMessageEvent = (event: MessageEvent) => {
			const iframe = iframeRef.current;
			if (!iframe) {
				return;
			}

			if (event.source !== iframe.contentWindow) {
				return;
			}

			const iframeId = iframe.getAttribute("id");
			if (iframeId !== __internalId) {
				return;
			}

			if (isIframeMessageResizeMessage(event.data)) {
				return applyIframeMessageResizeMessage(iframe, event.data);
			}

			if (onMessage) {
				const modifier = () => ({
					ui: {
						values: {
							[__internalId]: event.data,
						},
					},
				});

				send(`${prefix}:message` as NubeSDKRuntimeEvent, modifier);
			}
		};

		window.addEventListener("message", handleMessageEvent);

		return () => {
			window.removeEventListener("message", handleMessageEvent);
		};
	}, [__internalId, onMessage, autoresize, send]);

	return (
		<iframe
			ref={iframeRef}
			title={`iframe-${__internalId}`}
			id={__internalId}
			{...props}
			sandbox={sandboxAttribute}
		/>
	);
}
