export type SvgDefsProps = {
	children: React.ReactElement | React.ReactElement[];
	__internalId?: string;
} & React.SVGProps<SVGDefsElement>;

export function SvgDefs({
	children,
	__internalId,
	...rest
}: Readonly<SvgDefsProps>) {
	return (
		<defs className="nube-svg-defs" id={__internalId} {...rest}>
			{children}
		</defs>
	);
}

SvgDefs.displayName = "SvgDefs";
