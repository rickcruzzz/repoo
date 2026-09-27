export type SvgGProps = {
	children?: React.ReactElement | React.ReactElement[];
	__internalId?: string;
} & React.SVGProps<SVGGElement>;

export function SvgG({ children, __internalId, ...rest }: Readonly<SvgGProps>) {
	return (
		<g className="nube-svg-g" id={__internalId} {...rest}>
			{children}
		</g>
	);
}

SvgG.displayName = "SvgG";
