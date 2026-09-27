export type SvgPolygonProps = {
	children?: React.ReactElement | React.ReactElement[];
	__internalId?: string;
} & React.SVGProps<SVGPolygonElement>;

export function SvgPolygon({
	children,
	__internalId,
	...rest
}: Readonly<SvgPolygonProps>) {
	return (
		<polygon className="nube-svg-polygon" id={__internalId} {...rest}>
			{children}
		</polygon>
	);
}

SvgPolygon.displayName = "SvgPolygon";
