import type { ReactNode } from "react";
import { useContext } from "react";
import { classNames } from "../../helpers/class-names";
import { ClipboardContext } from "./clipboard-context";

type ClipboardTriggerProps = {
	id: string;
	__internalId: string;
	children?: ReactNode;
	disabled?: boolean;
	variant?: "primary" | "secondary" | "transparent" | "link";
	// biome-ignore lint/suspicious/noExplicitAny: we need to support any style
	style?: any;
	ariaLabel?: string;
};

/**
 * `Clipboard.Trigger` is the clickable button that copies the value held by
 * the surrounding `Clipboard.Root`. It mirrors the look and feel of the
 * `button` component; its children render as the button's content.
 */
export function ClipboardTrigger({
	id,
	__internalId,
	children,
	disabled,
	variant = "primary",
	style = {},
	ariaLabel,
}: Readonly<ClipboardTriggerProps>) {
	const context = useContext(ClipboardContext);

	const className = classNames("nube-clipboard-trigger btn", {
		"btn-primary": variant === "primary",
		"btn-secondary": variant === "secondary",
		"btn-transparent": variant === "transparent",
		"btn-link": variant === "link",
		"btn-disabled": disabled,
	});

	return (
		<button
			type="button"
			style={{
				display: "inline-flex",
				alignItems: "center",
				gap: "0.5em",
				...style,
			}}
			id={__internalId}
			data-component-id={id}
			className={className}
			onClick={() => context?.copy()}
			disabled={disabled}
			aria-label={ariaLabel ?? context?.copyLabel}
		>
			{children}
		</button>
	);
}
