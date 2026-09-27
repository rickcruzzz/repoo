export type SvgRectProps = {
	children?: React.ReactElement | React.ReactElement[];
	__internalId?: string;
} & React.SVGProps<SVGRectElement>;

export function SvgRect({
	children,
	__internalId,
	...rest
}: Readonly<SvgRectProps>) {
	return (
		<rect className="nube-svg-rect" id={__internalId} {...rest}>
			{children}
		</rect>
	);
}

SvgRect.displayName = "SvgRect";
