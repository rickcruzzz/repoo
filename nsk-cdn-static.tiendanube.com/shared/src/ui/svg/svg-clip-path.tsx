export type SvgClipPathProps = {
	children: React.ReactElement | React.ReactElement[];
	__internalId?: string;
} & React.SVGProps<SVGClipPathElement>;

export function SvgClipPath({
	children,
	__internalId,
	...rest
}: Readonly<SvgClipPathProps>) {
	return (
		<clipPath className="nube-svg-clip-path" id={__internalId} {...rest}>
			{children}
		</clipPath>
	);
}

SvgClipPath.displayName = "SvgClipPath";
