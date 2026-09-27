import {
	useEffect,
	useMemo,
	useRef,
	useState,
} from "@tiendanube/nube-sdk-react-runtime";
import type { ReactNode } from "react";
import { useNubeSDK } from "../../hooks/use-nube-sdk";
import { ClipboardContext } from "./clipboard-context";
import { getClipboardTranslations } from "./translations";

/** Default duration (ms) the "copied" state lasts before reverting. */
const DEFAULT_TIMEOUT = 2000;

type ClipboardRootProps = {
	id: string;
	__internalId: string;
	/** The text written to the clipboard. */
	value: string;
	children?: ReactNode;
	timeout?: number;
	// biome-ignore lint/suspicious/noExplicitAny: we need to support any style
	style?: any;
};

/**
 * Writes `text` to the clipboard. Uses the async Clipboard API when available
 * (requires a secure context)
 */
async function copyToClipboard(text: string): Promise<void> {
	if (navigator.clipboard?.writeText) {
		await navigator.clipboard.writeText(text);
	}
}

/**
 * `Clipboard.Root` wraps the clipboard compound. It owns the `value` to copy
 * and the `copied` state, exposing them to its descendants
 * (`Clipboard.Trigger` / `Clipboard.Indicator`) via `ClipboardContext`.
 *
 * The copy runs natively on the main thread (no web worker round-trip), so the
 * click's transient user activation is preserved — a requirement of
 * `navigator.clipboard.writeText`. The result is announced via `aria-live`.
 */
export function ClipboardRoot({
	id,
	__internalId,
	value,
	children,
	timeout = DEFAULT_TIMEOUT,
	style = {},
}: Readonly<ClipboardRootProps>) {
	const { state } = useNubeSDK("adapter");
	const [copied, setCopied] = useState(false);
	const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const translations = useMemo(
		() => getClipboardTranslations(state?.store?.language),
		[state?.store?.language],
	);

	useEffect(() => {
		return () => {
			if (timeoutRef.current) {
				clearTimeout(timeoutRef.current);
			}
		};
	}, []);

	const copy = () => {
		copyToClipboard(value)
			.then(() => {
				setCopied(true);
				if (timeoutRef.current) {
					clearTimeout(timeoutRef.current);
				}
				timeoutRef.current = setTimeout(() => setCopied(false), timeout);
			})
			.catch((error) => {
				console.error("Failed to copy text to clipboard:", error);
			});
	};

	const contextValue = {
		copied,
		copy,
		copyLabel: translations.copyLabel,
		copiedLabel: translations.copiedLabel,
	};

	return (
		<ClipboardContext.Provider value={contextValue}>
			<div
				className="nube-clipboard"
				id={__internalId}
				data-component-id={id}
				style={style}
			>
				{children}
				<span
					className="nube-clipboard-status"
					aria-live="polite"
					style={{
						position: "absolute",
						width: "1px",
						height: "1px",
						overflow: "hidden",
						clip: "rect(0 0 0 0)",
						whiteSpace: "nowrap",
					}}
				>
					{copied ? translations.copiedLabel : ""}
				</span>
			</div>
		</ClipboardContext.Provider>
	);
}
