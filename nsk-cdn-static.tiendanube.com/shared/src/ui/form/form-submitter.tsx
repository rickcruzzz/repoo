import type { CSSProperties, ReactNode } from "react";
import {
	type FormButtonSize,
	type FormButtonVariant,
	buildFormButton,
} from "./build-button";

export type FormSubmitterVariant = FormButtonVariant;
export type FormSubmitterSize = FormButtonSize;

export type FormSubmitterProps = {
	id?: string;
	__internalId: string;
	disabled?: boolean;
	variant?: FormSubmitterVariant;
	width?: FormSubmitterSize;
	height?: FormSubmitterSize;
	ariaLabel?: string;
	children?: ReactNode;
	style?: CSSProperties;
};

export function FormSubmitter({
	id,
	__internalId,
	disabled,
	variant = "primary",
	width,
	height,
	ariaLabel,
	children,
	style,
}: Readonly<FormSubmitterProps>) {
	const { className, style: inlineStyle } = buildFormButton({
		baseClass: "nube-form-submitter",
		variant,
		disabled,
		width,
		height,
		style,
	});

	return (
		<button
			type="submit"
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
