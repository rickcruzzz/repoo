export type SvgPolylineProps = {
	children?: React.ReactElement | React.ReactElement[];
	__internalId?: string;
} & React.SVGProps<SVGPolylineElement>;

export function SvgPolyline({
	children,
	__internalId,
	...rest
}: Readonly<SvgPolylineProps>) {
	return (
		<polyline className="nube-svg-polyline" id={__internalId} {...rest}>
			{children}
		</polyline>
	);
}

SvgPolyline.displayName = "SvgPolyline";
