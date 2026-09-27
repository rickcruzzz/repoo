import type React from "react";
import type { CSSProperties, ReactElement } from "react";
import * as ReactUtils from "react";

export type AccordionRootProps = {
	defaultValue?: string;
	children: ReactElement | ReactElement[];
	style?: CSSProperties;
	__internalId?: string;
};

export function AccordionRoot({
	children,
	defaultValue,
	style,
	__internalId,
}: Readonly<AccordionRootProps>) {
	return (
		<div className="nube-accordion-root" style={style} id={__internalId}>
			{ReactUtils.Children.map(children, (child) => {
				const newChild = {
					...child,
					props: {
						...child.props,
						component: { ...child.props.component, defaultValue },
					},
				};
				return newChild;
			})}
		</div>
	);
}

AccordionRoot.displayName = "AccordionRoot";
