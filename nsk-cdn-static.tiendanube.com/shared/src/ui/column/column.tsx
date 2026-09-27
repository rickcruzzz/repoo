import { toStyle } from "../../helpers/to-style";
import type { BoxProps } from "../../types";

export function Column({
	children,
	style,
	__internalId,
	...options
}: Readonly<BoxProps>) {
	const customStyle = toStyle(options);

	return (
		<div
			className="nube-column"
			data-direction="col"
			id={__internalId}
			style={{ ...customStyle, ...style }}
		>
			{children}
		</div>
	);
}
