import type { CSSProperties, ReactNode } from "react";

export type ToastTitleProps = {
	style?: CSSProperties;
	children: ReactNode;
	__internalId?: string;
};

export const ToastTitle = ({
	children,
	style,
	__internalId,
}: ToastTitleProps) => (
	<p id={__internalId} className="nube-toast-title toast-message" style={style}>
		{children}
	</p>
);
