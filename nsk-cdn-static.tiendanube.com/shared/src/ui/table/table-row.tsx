import type { CSSProperties, ReactNode } from "react";
import { toAlign } from "./helpers";
import type { TableRowAlign } from "./types";

export type TableRowProps = {
	__internalId?: string;
	children?: ReactNode;
	align?: TableRowAlign;
	style?: CSSProperties;
};

export function TableRow({
	__internalId,
	children,
	align,
	style,
}: Readonly<TableRowProps>) {
	return (
		<tr
			className="nube-table-row"
			id={__internalId}
			style={{ verticalAlign: toAlign(align), ...style }}
		>
			{children}
		</tr>
	);
}

TableRow.displayName = "TableRow";
