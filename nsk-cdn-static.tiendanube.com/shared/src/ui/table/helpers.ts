import type { CSSProperties } from "react";
import type {
	TableCellBaseProps,
	TableCellJustify,
	TableCellValue,
	TableRowAlign,
} from "./types";

const justifyOptions: Record<TableCellJustify, CSSProperties["textAlign"]> = {
	start: "start",
	center: "center",
	end: "end",
};

const alignOptions: Record<TableRowAlign, CSSProperties["verticalAlign"]> = {
	start: "top",
	center: "middle",
	end: "bottom",
	baseline: "baseline",
};

/**
 * Translates the horizontal alignment of a cell into a `text-align` value.
 */
export function toJustify(
	justify?: TableCellJustify,
): CSSProperties["textAlign"] {
	return justify ? justifyOptions[justify] : undefined;
}

/**
 * Translates the vertical alignment of a row into a `vertical-align` value.
 */
export function toAlign(align?: TableRowAlign): CSSProperties["verticalAlign"] {
	return align ? alignOptions[align] : undefined;
}

/**
 * Builds the inline style of a table cell from its sizing and alignment
 * properties. The `style` given by the app always wins.
 */
export function toCellStyle({
	justify,
	width,
	minWidth,
	maxWidth,
	style,
}: Pick<
	TableCellBaseProps,
	"justify" | "width" | "minWidth" | "maxWidth" | "style"
>): CSSProperties {
	return {
		textAlign: toJustify(justify),
		width,
		minWidth,
		maxWidth,
		...style,
	};
}

/**
 * Renders a raw cell value as text. `null` and `undefined` become an empty
 * cell so a missing key does not print "null" in the storefront.
 */
export function toCellText(value: TableCellValue): string {
	if (value === null || value === undefined) return "";
	return String(value);
}
