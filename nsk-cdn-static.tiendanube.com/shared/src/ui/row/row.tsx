import { toStyle } from "../../helpers/to-style";
import type { BoxProps } from "../../types";
export function Row({
	children,
	style,
	__internalId,
	...options
}: Readonly<BoxProps>) {
	const customStyle = toStyle(options);

	return (
		<div
			className="nube-row"
			data-direction="row"
			id={__internalId}
			style={{ ...customStyle, ...style }}
		>
			{children}
		</div>
	);
}
