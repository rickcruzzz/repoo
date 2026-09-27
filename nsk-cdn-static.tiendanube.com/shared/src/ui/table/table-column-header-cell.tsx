import { toCellStyle } from "./helpers";
import type { TableCellBaseProps } from "./types";

export type TableColumnHeaderCellProps = TableCellBaseProps;

export function TableColumnHeaderCell({
	__internalId,
	children,
	colSpan,
	rowSpan,
	...cellProps
}: Readonly<TableColumnHeaderCellProps>) {
	return (
		<th
			scope="col"
			className="nube-table-column-header-cell"
			id={__internalId}
			style={toCellStyle(cellProps)}
			colSpan={colSpan}
			rowSpan={rowSpan}
		>
			{children}
		</th>
	);
}

TableColumnHeaderCell.displayName = "TableColumnHeaderCell";
