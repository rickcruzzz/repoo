import type { CSSProperties, ReactNode } from "react";

export type TableBodyProps = {
	__internalId?: string;
	children?: ReactNode;
	style?: CSSProperties;
};

export function TableBody({
	__internalId,
	children,
	style,
}: Readonly<TableBodyProps>) {
	return (
		<tbody className="nube-table-body" id={__internalId} style={style}>
			{children}
		</tbody>
	);
}

TableBody.displayName = "TableBody";
