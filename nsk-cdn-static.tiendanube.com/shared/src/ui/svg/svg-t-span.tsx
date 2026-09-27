export type SvgTSpanProps = {
	children?: string;
	__internalId?: string;
} & React.SVGProps<SVGTSpanElement>;

export function SvgTSpan({
	children,
	__internalId,
	...rest
}: Readonly<SvgTSpanProps>) {
	return (
		<tspan className="nube-svg-tspan" id={__internalId} {...rest}>
			{children}
		</tspan>
	);
}

SvgTSpan.displayName = "SvgTSpan";
