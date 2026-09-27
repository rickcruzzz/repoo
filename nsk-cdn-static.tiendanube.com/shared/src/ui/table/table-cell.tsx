import { toCellStyle } from "./helpers";
import type { TableCellBaseProps } from "./types";

export type TableCellProps = TableCellBaseProps;

export function TableCell({
	__internalId,
	children,
	colSpan,
	rowSpan,
	...cellProps
}: Readonly<TableCellProps>) {
	return (
		<td
			className="nube-table-cell"
			id={__internalId}
			style={toCellStyle(cellProps)}
			colSpan={colSpan}
			rowSpan={rowSpan}
		>
			{children}
		</td>
	);
}

TableCell.displayName = "TableCell";
