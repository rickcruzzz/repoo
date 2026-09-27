import { toStyle } from "../../helpers/to-style";
import type { BoxProps } from "../../types";

export function Box({
	__internalId,
	children,
	style,
	...options
}: Readonly<BoxProps>) {
	const customStyle = toStyle(options);

	return (
		<div
			className="nube-box"
			id={__internalId}
			style={{ ...customStyle, ...style }}
		>
			{children}
		</div>
	);
}
