export type SvgPatternProps = {
	children: React.ReactElement | React.ReactElement[];
	__internalId?: string;
} & React.SVGProps<SVGPatternElement>;

export function SvgPattern({
	children,
	__internalId,
	...rest
}: Readonly<SvgPatternProps>) {
	return (
		<pattern className="nube-svg-pattern" id={__internalId} {...rest}>
			{children}
		</pattern>
	);
}

SvgPattern.displayName = "SvgPattern";
