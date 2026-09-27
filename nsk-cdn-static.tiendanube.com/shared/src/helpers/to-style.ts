import type { CSSProperties } from "react";
import type { BoxProps } from "../types";

const alignContentOptions = {
	center: "center",
	"space-around": "space-around",
	"space-between": "space-between",
	"space-evenly": "space-evenly",
	start: "flex-start",
} as const;

const directionOptions = {
	col: "column",
	row: "row",
} as const;

const alignItemsOptions = {
	center: "center",
	end: "flex-end",
	start: "flex-start",
	stretch: "stretch",
} as const;

export function toStyle(
	props: Partial<{ display: CSSProperties["display"] } & BoxProps>,
) {
	const style: React.CSSProperties = {
		alignContent: props.alignContent
			? alignContentOptions[
					props.alignContent as keyof typeof alignContentOptions
				]
			: undefined,
		alignItems: props.alignItems
			? alignItemsOptions[props.alignItems as keyof typeof alignItemsOptions]
			: undefined,
		backgroundColor: props.background,
		borderRadius:
			typeof props.borderRadius === "number"
				? `${props.borderRadius}px`
				: props.borderRadius,
		color: props.color,
		display: props.display,
		flexDirection:
			props.direction && props.reverse
				? `${directionOptions[props.direction as keyof typeof directionOptions]}-reverse`
				: props.direction
					? directionOptions[props.direction as keyof typeof directionOptions]
					: undefined,
		gap: typeof props.gap === "number" ? `${props.gap}px` : props.gap,
		height: props.height,
		justifyContent: props.justifyContent,
		margin:
			typeof props.margin === "number" ? `${props.margin}px` : props.margin,
		padding:
			typeof props.padding === "number" ? `${props.padding}px` : props.padding,
		width: props.width,
	};

	return style;
}
