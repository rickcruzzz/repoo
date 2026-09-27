import type { CSSProperties } from "react";
import { classNames } from "../../helpers/class-names";

export type FormButtonVariant =
	| "primary"
	| "secondary"
	| "transparent"
	| "link";

export type FormButtonSize = string | number;

export type FormButtonChromeInput = {
	/** Class name applied alongside `btn` (e.g. `nube-form-submitter`). */
	baseClass: string;
	variant: FormButtonVariant;
	disabled?: boolean;
	width?: FormButtonSize;
	height?: FormButtonSize;
	style?: CSSProperties;
};

export type FormButtonChrome = {
	className: string;
	style: CSSProperties;
};

/**
 * Shared className + inline-style assembly for `FormSubmitter` and
 * `FormResetter` — both buttons inherit `Button`'s style surface
 * (variant / disabled / width / height / style / ariaLabel) and only
 * differ in their HTML `type` attribute and default variant.
 */
export function buildFormButton(
	input: Readonly<FormButtonChromeInput>,
): FormButtonChrome {
	const { baseClass, variant, disabled, width, height, style } = input;

	const className = classNames(`${baseClass} btn`, {
		"btn-primary": variant === "primary",
		"btn-secondary": variant === "secondary",
		"btn-transparent": variant === "transparent",
		"btn-link": variant === "link",
		"btn-disabled": disabled,
	});

	const hasExplicitWidth = width !== undefined;
	const hasExplicitHeight = height !== undefined;

	const composedStyle: CSSProperties = {
		...(hasExplicitWidth ? { width } : {}),
		...(hasExplicitHeight ? { height } : {}),
		...style,
	};

	return { className, style: composedStyle };
}
