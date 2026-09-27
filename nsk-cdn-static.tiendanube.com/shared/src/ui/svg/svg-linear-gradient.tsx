export type SvgLinearGradientProps = {
	children: React.ReactElement | React.ReactElement[];
	__internalId?: string;
} & React.SVGProps<SVGLinearGradientElement>;

export function SvgLinearGradient({
	children,
	__internalId,
	...rest
}: Readonly<SvgLinearGradientProps>) {
	return (
		<linearGradient
			className="nube-svg-linear-gradient"
			id={__internalId}
			{...rest}
		>
			{children}
		</linearGradient>
	);
}

SvgLinearGradient.displayName = "SvgLinearGradient";
