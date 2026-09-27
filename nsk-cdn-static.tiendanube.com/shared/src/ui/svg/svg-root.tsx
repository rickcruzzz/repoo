export type SvgRootProps = {
	children: React.ReactElement | React.ReactElement[];
	__internalId?: string;
} & React.SVGProps<SVGSVGElement>;

export function SvgRoot({
	children,
	__internalId,
	...rest
}: Readonly<SvgRootProps>) {
	return (
		// biome-ignore lint/a11y/noSvgWithoutTitle: <explanation>
		<svg className="nube-svg-root" id={__internalId} {...rest}>
			{children}
		</svg>
	);
}

SvgRoot.displayName = "SvgRoot";
