export type SvgFeGaussianBlurProps = {
	children?: React.ReactElement | React.ReactElement[];
	__internalId?: string;
} & React.SVGProps<SVGFEGaussianBlurElement>;

export function SvgFeGaussianBlur({
	children,
	__internalId,
	...rest
}: Readonly<SvgFeGaussianBlurProps>) {
	return (
		<feGaussianBlur
			className="nube-svg-fe-gaussian-blur"
			id={__internalId}
			{...rest}
		>
			{children}
		</feGaussianBlur>
	);
}

SvgFeGaussianBlur.displayName = "SvgFeGaussianBlur";
