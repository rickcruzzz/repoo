import type { CSSProperties, ReactNode } from "react";

export type ToastDescriptionProps = {
	style?: CSSProperties;
	children: ReactNode;
	__internalId?: string;
};

export const ToastDescription = ({
	children,
	style,
	__internalId,
}: ToastDescriptionProps) => (
	<p
		id={__internalId}
		className="nube-toast-description toast-description"
		style={style}
	>
		{children}
	</p>
);
