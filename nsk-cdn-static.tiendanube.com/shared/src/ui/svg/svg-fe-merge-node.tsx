export type SvgFeMergeNodeProps = {
	children?: React.ReactElement | React.ReactElement[];
	__internalId?: string;
} & React.SVGProps<SVGFEMergeNodeElement>;

export function SvgFeMergeNode({
	children,
	__internalId,
	...rest
}: Readonly<SvgFeMergeNodeProps>) {
	return (
		<feMergeNode className="nube-svg-fe-merge-node" id={__internalId} {...rest}>
			{children}
		</feMergeNode>
	);
}

SvgFeMergeNode.displayName = "SvgFeMergeNode";
