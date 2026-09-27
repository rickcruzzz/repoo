import type { CSSProperties, ReactNode } from "react";
import { classNames } from "../../helpers/class-names";
import { toCellText } from "./helpers";
import { TableBody } from "./table-body";
import { TableCell } from "./table-cell";
import { TableColumnHeaderCell } from "./table-column-header-cell";
import { TableHeader } from "./table-header";
import { TableRow } from "./table-row";
import type {
	TableColumn,
	TableDataRow,
	TableLayout,
	TableSize,
	TableVariant,
} from "./types";

export type TableRootProps = {
	id?: string;
	__internalId?: string;
	children?: ReactNode;
	size?: TableSize;
	variant?: TableVariant;
	layout?: TableLayout;
	data?: TableDataRow[];
	columns?: TableColumn[];
	style?: CSSProperties;
};

/**
 * Renders the header and the body of a table from `data` and `columns`,
 * one column header cell per column and one cell per column of each row.
 */
function renderFromData(data: TableDataRow[], columns: TableColumn[]) {
	return (
		<>
			<TableHeader>
				<TableRow>
					{columns.map((column) => (
						<TableColumnHeaderCell
							key={column.key}
							justify={column.justify}
							width={column.width}
							minWidth={column.minWidth}
							maxWidth={column.maxWidth}
						>
							{column.label ?? column.key}
						</TableColumnHeaderCell>
					))}
				</TableRow>
			</TableHeader>
			<TableBody>
				{data.map((row, rowIndex) => (
					// biome-ignore lint/suspicious/noArrayIndexKey: rows are raw data without a stable identity
					<TableRow key={`row-${rowIndex}`}>
						{columns.map((column) => (
							<TableCell key={column.key} justify={column.justify}>
								{toCellText(row?.[column.key])}
							</TableCell>
						))}
					</TableRow>
				))}
			</TableBody>
		</>
	);
}

export function TableRoot({
	id,
	__internalId,
	children,
	size = "2",
	variant = "ghost",
	layout,
	data,
	columns,
	style,
}: Readonly<TableRootProps>) {
	// A table declared through `data` and `columns` is rendered from the data
	// and its children are ignored, as documented in `NubeComponentTableRoot`.
	const isDataDriven =
		Array.isArray(data) && Array.isArray(columns) && columns.length > 0;

	const className = classNames(
		"nube-table-root",
		`nube-table-root--size-${size}`,
		{
			"nube-table-root--surface": variant === "surface",
			"nube-table-root--ghost": variant === "ghost",
		},
	);

	return (
		<table
			className={className}
			id={__internalId}
			data-component-id={id}
			style={{ tableLayout: layout, ...style }}
		>
			{isDataDriven ? renderFromData(data, columns) : children}
		</table>
	);
}

TableRoot.displayName = "TableRoot";
