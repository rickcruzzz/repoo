import type { CSSProperties, ReactNode } from "react";

export type ProgressProps = {
	value?: number;
	max?: number;
	__internalId: string;
	children: ReactNode;
	style?: CSSProperties;
};

export function Progress({
	value,
	max,
	style,
	children,
	__internalId,
	...props
}: Readonly<ProgressProps>) {
	return (
		<progress
			className="nube-progress"
			id={__internalId}
			style={style}
			value={value}
			max={max}
			{...props}
		>
			{children}
		</progress>
	);
}
