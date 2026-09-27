export type SvgSymbolProps = {
	children: React.ReactElement | React.ReactElement[];
	__internalId?: string;
} & React.SVGProps<SVGSymbolElement>;

export function SvgSymbol({
	children,
	__internalId,
	...rest
}: Readonly<SvgSymbolProps>) {
	return (
		<symbol className="nube-svg-symbol" id={__internalId} {...rest}>
			{children}
		</symbol>
	);
}

SvgSymbol.displayName = "SvgSymbol";
