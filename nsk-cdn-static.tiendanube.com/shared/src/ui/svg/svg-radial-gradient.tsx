export type SvgRadialGradientProps = {
	children: React.ReactElement | React.ReactElement[];
	__internalId?: string;
} & React.SVGProps<SVGRadialGradientElement>;

export function SvgRadialGradient({
	children,
	__internalId,
	...rest
}: Readonly<SvgRadialGradientProps>) {
	return (
		<radialGradient
			className="nube-svg-radial-gradient"
			id={__internalId}
			{...rest}
		>
			{children}
		</radialGradient>
	);
}

SvgRadialGradient.displayName = "SvgRadialGradient";
