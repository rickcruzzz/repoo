import type { CSSProperties, ReactNode } from "react";
import type { ValidityStateKey } from "./validity-keys";

export type FormFieldErrorProps = {
	id?: string;
	__internalId: string;
	match: ValidityStateKey;
	children?: ReactNode;
	style?: CSSProperties;
};

export function FormFieldError({
	id,
	__internalId,
	match,
	children,
	style,
}: Readonly<FormFieldErrorProps>) {
	return (
		<span
			className="nube-form-field-error"
			id={__internalId}
			data-component-id={id}
			data-match={match}
			style={style}
		>
			{children}
		</span>
	);
}
