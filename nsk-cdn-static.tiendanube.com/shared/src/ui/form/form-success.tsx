import type { CSSProperties, ReactNode } from "react";

export type FormSuccessProps = {
	id?: string;
	__internalId: string;
	children?: ReactNode;
	style?: CSSProperties;
};

/**
 * Container rendered by `FormRoot` when status === 'success'. Gating
 * logic lives in `FormRoot` — this component is just a styled wrapper.
 */
export function FormSuccess({
	id,
	__internalId,
	children,
	style,
}: Readonly<FormSuccessProps>) {
	return (
		<div
			className="nube-form-success"
			id={__internalId}
			data-component-id={id}
			data-form-state="success"
			style={style}
		>
			{children}
		</div>
	);
}

/**
 * Static marker `FormRoot.partitionChildren` uses to recognise this
 * component when rendered directly (without the `DynamicRender` wrapper
 * that adds `props.component.type`).
 */
(FormSuccess as { __formConditionalType?: string }).__formConditionalType =
	"formSuccess";
