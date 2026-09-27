export type SvgFeMergeProps = {
	children: React.ReactElement | React.ReactElement[];
	__internalId?: string;
} & React.SVGProps<SVGFEMergeElement>;

export function SvgFeMerge({
	children,
	__internalId,
	...rest
}: Readonly<SvgFeMergeProps>) {
	return (
		<feMerge className="nube-svg-fe-merge" id={__internalId} {...rest}>
			{children}
		</feMerge>
	);
}

SvgFeMerge.displayName = "SvgFeMerge";
