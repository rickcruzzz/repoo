import type { NubeSDKRuntimeState } from "@tiendanube/nube-sdk-internal-types";
import { memo, useState } from "@tiendanube/nube-sdk-react-runtime";
import type { DeepPartial } from "@tiendanube/nube-sdk-types";
import type { CSSProperties, ReactElement } from "react";
import { useNubeSDK } from "../../hooks/use-nube-sdk";

export type AccordionItemProps = {
	id: string;
	__internalId: string;
	children: ReactElement | ReactElement[];
	showIcon?: boolean;
	onToggle?: boolean;
	defaultValue?: string;
	value?: string;
	style?: CSSProperties;
};

export function AccordionItemComponent({
	__internalId,
	children,
	onToggle,
	defaultValue,
	value,
	style,
}: Readonly<AccordionItemProps>) {
	const { send } = useNubeSDK("adapter");
	const [isOpen, setIsOpen] = useState(false);

	const handleToggle = () => {
		setIsOpen((prev) => !prev);

		if (onToggle) {
			send(
				`custom:accordion:${__internalId}:click`,
				({ ui }) =>
					({
						ui: {
							...ui,
							values: {
								...ui.values,
								[__internalId]: undefined,
							},
						},
					}) as unknown as DeepPartial<NubeSDKRuntimeState>,
			); // TODO: Remove this cast then fix on types);
		}
	};

	return (
		<details
			className="nube-accordion-item"
			onToggle={handleToggle}
			open={defaultValue === value}
			style={style}
			id={__internalId}
		>
			{children}
		</details>
	);
}

AccordionItemComponent.displayName = "AccordionItem";

export const AccordionItem = memo(AccordionItemComponent);
