import type { CSSProperties, ReactNode } from "react";

export type FormSendingProps = {
	id?: string;
	__internalId: string;
	children?: ReactNode;
	style?: CSSProperties;
};

/**
 * Container rendered by `FormRoot` while status === 'sending'.
 */
export function FormSending({
	id,
	__internalId,
	children,
	style,
}: Readonly<FormSendingProps>) {
	return (
		<div
			className="nube-form-sending"
			id={__internalId}
			data-component-id={id}
			data-form-state="sending"
			style={style}
		>
			{children}
		</div>
	);
}

(FormSending as { __formConditionalType?: string }).__formConditionalType =
	"formSending";
