export type SvgUseProps = {
	children: React.ReactElement | React.ReactElement[];
	__internalId?: string;
} & React.SVGProps<SVGUseElement>;

export function SvgUse({
	children,
	__internalId,
	...rest
}: Readonly<SvgUseProps>) {
	return (
		<use className="nube-svg-use" id={__internalId} {...rest}>
			{children}
		</use>
	);
}

SvgUse.displayName = "SvgUse";
