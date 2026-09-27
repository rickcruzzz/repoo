export type SvgEllipseProps = {
	children?: React.ReactElement | React.ReactElement[];
	__internalId?: string;
} & React.SVGProps<SVGEllipseElement>;

export function SvgEllipse({
	children,
	__internalId,
	...rest
}: Readonly<SvgEllipseProps>) {
	return (
		<ellipse className="nube-svg-ellipse" id={__internalId} {...rest}>
			{children}
		</ellipse>
	);
}

SvgEllipse.displayName = "SvgEllipse";
