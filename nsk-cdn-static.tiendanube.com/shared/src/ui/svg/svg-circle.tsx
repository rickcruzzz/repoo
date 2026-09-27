export type SvgCircleProps = {
	children?: React.ReactElement | React.ReactElement[];
	__internalId?: string;
} & React.SVGProps<SVGCircleElement>;

export function SvgCircle({
	children,
	__internalId,
	...rest
}: Readonly<SvgCircleProps>) {
	return (
		<circle className="nube-svg-circle" id={__internalId} {...rest}>
			{children}
		</circle>
	);
}

SvgCircle.displayName = "SvgCircle";
