export type SvgStopProps = {
	children?: React.ReactElement | React.ReactElement[];
	__internalId?: string;
} & React.SVGProps<SVGStopElement>;

export function SvgStop({
	children,
	__internalId,
	...rest
}: Readonly<SvgStopProps>) {
	return (
		<stop className="nube-svg-stop" id={__internalId} {...rest}>
			{children}
		</stop>
	);
}

SvgStop.displayName = "SvgStop";
