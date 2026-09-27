import type { CSSProperties, ReactNode } from "react";

export type FormFailureProps = {
	id?: string;
	__internalId: string;
	children?: ReactNode;
	style?: CSSProperties;
};

/**
 * Container rendered by `FormRoot` when status === 'failure'.
 */
export function FormFailure({
	id,
	__internalId,
	children,
	style,
}: Readonly<FormFailureProps>) {
	return (
		<div
			className="nube-form-failure"
			id={__internalId}
			data-component-id={id}
			data-form-state="failure"
			style={style}
		>
			{children}
		</div>
	);
}

(FormFailure as { __formConditionalType?: string }).__formConditionalType =
	"formFailure";
