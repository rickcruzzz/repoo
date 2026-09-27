export type SvgFeOffsetProps = {
	children?: React.ReactElement | React.ReactElement[];
	__internalId?: string;
} & React.SVGProps<SVGFEOffsetElement>;

export function SvgFeOffset({
	children,
	__internalId,
	...rest
}: Readonly<SvgFeOffsetProps>) {
	return (
		<feOffset className="nube-svg-fe-offset" id={__internalId} {...rest}>
			{children}
		</feOffset>
	);
}

SvgFeOffset.displayName = "SvgFeOffset";
