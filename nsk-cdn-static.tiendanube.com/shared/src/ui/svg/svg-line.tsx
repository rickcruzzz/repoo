export type SvgLineProps = {
	children?: React.ReactElement | React.ReactElement[];
	__internalId?: string;
} & React.SVGProps<SVGLineElement>;

export function SvgLine({
	children,
	__internalId,
	...rest
}: Readonly<SvgLineProps>) {
	return (
		<line className="nube-svg-line" id={__internalId} {...rest}>
			{children}
		</line>
	);
}

SvgLine.displayName = "SvgLine";
