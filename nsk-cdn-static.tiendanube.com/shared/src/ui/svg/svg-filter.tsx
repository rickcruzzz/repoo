export type SvgFilterProps = {
	children: React.ReactElement | React.ReactElement[];
	__internalId?: string;
} & React.SVGProps<SVGFilterElement>;

export function SvgFilter({
	children,
	__internalId,
	...rest
}: Readonly<SvgFilterProps>) {
	return (
		<filter className="nube-svg-filter" id={__internalId} {...rest}>
			{children}
		</filter>
	);
}

SvgFilter.displayName = "SvgFilter";
