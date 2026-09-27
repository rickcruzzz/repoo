import type { CSSProperties, ReactNode } from "react";

export type TableHeaderProps = {
	__internalId?: string;
	children?: ReactNode;
	style?: CSSProperties;
};

export function TableHeader({
	__internalId,
	children,
	style,
}: Readonly<TableHeaderProps>) {
	return (
		<thead className="nube-table-header" id={__internalId} style={style}>
			{children}
		</thead>
	);
}

TableHeader.displayName = "TableHeader";
