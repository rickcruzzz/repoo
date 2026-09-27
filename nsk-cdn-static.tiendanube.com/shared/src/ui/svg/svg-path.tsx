export type SvgPathProps = {
	children?: React.ReactElement | React.ReactElement[];
	__internalId?: string;
} & React.SVGProps<SVGPathElement>;

export function SvgPath({
	children,
	__internalId,
	...rest
}: Readonly<SvgPathProps>) {
	return (
		<path className="nube-svg-path" id={__internalId} {...rest}>
			{children}
		</path>
	);
}

SvgPath.displayName = "SvgPath";
