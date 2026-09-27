import type { ReactElement } from "react";
import { classNames } from "../../helpers/class-names";

type PopoverButtonProps = {
	children: string | ReactElement;
	__internalId: string;
	disabled?: boolean;
	variant?: "primary" | "secondary" | "transparent" | "link";
	asChild?: boolean;
	// biome-ignore lint/suspicious/noExplicitAny: we need to support any style
	style?: any;
	ariaLabel?: string;
	/** Injected by PopoverRoot. */
	isOpen?: boolean;
	/** Injected by PopoverRoot. */
	onToggle?: () => void;
};

export function PopoverButton({
	children,
	__internalId,
	disabled,
	variant = "primary",
	asChild = false,
	style = {},
	ariaLabel,
	isOpen = false,
	onToggle,
}: Readonly<PopoverButtonProps>) {
	const handleClick = () => {
		if (!disabled) {
			onToggle?.();
		}
	};

	const triggerProps = {
		id: __internalId,
		"aria-label": ariaLabel,
		"aria-haspopup": "dialog" as const,
		"aria-expanded": isOpen,
	};

	if (asChild) {
		return (
			// `onClickCapture` runs during the capture phase (top-down), before the
			// child's own bubble-phase handler, so the popover still toggles even if
			// the child calls `stopPropagation()` on its click.
			<span
				className="nube-popover-button-as-child"
				style={{ display: "contents" }}
				onClickCapture={handleClick}
				{...triggerProps}
			>
				{children}
			</span>
		);
	}

	const className = classNames("nube-popover-button btn", {
		"btn-primary": variant === "primary",
		"btn-secondary": variant === "secondary",
		"btn-transparent": variant === "transparent",
		"btn-link": variant === "link",
		"btn-disabled": disabled,
	});

	return (
		<button
			type="button"
			style={style}
			className={className}
			disabled={disabled}
			onClick={handleClick}
			{...triggerProps}
		>
			{children}
		</button>
	);
}

PopoverButton.displayName = "PopoverButton";
