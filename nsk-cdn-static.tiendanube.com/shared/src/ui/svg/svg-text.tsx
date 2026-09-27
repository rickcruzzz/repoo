export type SvgTextProps = {
	children: React.ReactElement | React.ReactElement[];
	__internalId?: string;
} & React.SVGProps<SVGTextElement>;

export function SvgText({
	children,
	__internalId,
	...rest
}: Readonly<SvgTextProps>) {
	return (
		<text className="nube-svg-text" id={__internalId} {...rest}>
			{children}
		</text>
	);
}

SvgText.displayName = "SvgText";
