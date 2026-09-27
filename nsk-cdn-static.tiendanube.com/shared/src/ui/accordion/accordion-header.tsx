import { memo } from "@tiendanube/nube-sdk-react-runtime";
import type { CSSProperties, ReactElement } from "react";
import { Icon } from "../Icon";

export type AccordionHeaderProps = {
	children: ReactElement | ReactElement[];
	showIcon?: boolean;
	style?: CSSProperties;
	isOpen?: boolean;
	__internalId?: string;
};

export function AccordionHeaderComponent({
	children,
	showIcon = true,
	isOpen = false,
	__internalId,
	...props
}: Readonly<AccordionHeaderProps>) {
	return (
		<summary
			className="nube-accordion-header"
			id={__internalId}
			style={props.style}
		>
			{showIcon && <Icon name={isOpen ? "chevron-down" : "chevron-right"} />}
			{children}
		</summary>
	);
}

AccordionHeaderComponent.displayName = "AccordionHeader";

export const AccordionHeader = memo(AccordionHeaderComponent);
