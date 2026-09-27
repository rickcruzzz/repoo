export type SvgMaskProps = {
	children: React.ReactElement | React.ReactElement[];
	__internalId?: string;
} & React.SVGProps<SVGMaskElement>;

export function SvgMask({
	children,
	__internalId,
	...rest
}: Readonly<SvgMaskProps>) {
	return (
		<mask className="nube-svg-mask" id={__internalId} {...rest}>
			{children}
		</mask>
	);
}

SvgMask.displayName = "SvgMask";
