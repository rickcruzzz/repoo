import { memo } from "@tiendanube/nube-sdk-react-runtime";
import type { ReactElement } from "react";

export type AccordionContentProps = {
	children: ReactElement | ReactElement[];
	__internalId?: string;
};

export function AccordionContentComponent({
	children,
	__internalId,
}: Readonly<AccordionContentProps>) {
	return (
		<div className="nube-accordion-content content" id={__internalId}>
			{children}
		</div>
	);
}

AccordionContentComponent.displayName = "AccordionContent";

export const AccordionContent = memo(AccordionContentComponent);
