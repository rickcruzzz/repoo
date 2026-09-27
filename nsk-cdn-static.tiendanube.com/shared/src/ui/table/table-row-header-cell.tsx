import { toCellStyle } from "./helpers";
import type { TableCellBaseProps } from "./types";

export type TableRowHeaderCellProps = TableCellBaseProps;

export function TableRowHeaderCell({
	__internalId,
	children,
	colSpan,
	rowSpan,
	...cellProps
}: Readonly<TableRowHeaderCellProps>) {
	return (
		<th
			scope="row"
			className="nube-table-row-header-cell"
			id={__internalId}
			style={toCellStyle(cellProps)}
			colSpan={colSpan}
			rowSpan={rowSpan}
		>
			{children}
		</th>
	);
}

TableRowHeaderCell.displayName = "TableRowHeaderCell";
