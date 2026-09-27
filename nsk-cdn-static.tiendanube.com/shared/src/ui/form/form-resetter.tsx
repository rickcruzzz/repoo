import type { CSSProperties, ReactNode } from "react";
import {
	type FormButtonSize,
	type FormButtonVariant,
	buildFormButton,
} from "./build-button";

export type FormResetterVariant = FormButtonVariant;
export type FormResetterSize = FormButtonSize;

export type FormResetterProps = {
	id?: string;
	__internalId: string;
	disabled?: boolean;
	variant?: FormResetterVariant;
	width?: FormResetterSize;
	height?: FormResetterSize;
	ariaLabel?: string;
	children?: ReactNode;
	style?: CSSProperties;
};

export function FormResetter({
	id,
	__internalId,
	disabled,
	variant = "secondary",
	width,
	height,
	ariaLabel,
	children,
	style,
}: Readonly<FormResetterProps>) {
	const { className, style: inlineStyle } = buildFormButton({
		baseClass: "nube-form-resetter",
		variant,
		disabled,
		width,
		height,
		style,
	});

	return (
		<button
			type="reset"
			className={className}
			id={__internalId}
			data-component-id={id}
			disabled={disabled}
			aria-label={ariaLabel}
			style={inlineStyle}
		>
			{children}
		</button>
	);
}
