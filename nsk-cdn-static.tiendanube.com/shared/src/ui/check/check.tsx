import type { NubeSDKRuntimeState } from "@tiendanube/nube-sdk-internal-types";
import { useState } from "@tiendanube/nube-sdk-react-runtime";
import type { DeepPartial } from "@tiendanube/nube-sdk-types";
import type { ChangeEvent } from "react";
import type { CSSProperties } from "react";
import { useNubeSDK } from "../../hooks/use-nube-sdk";
import { Icon } from "../Icon/Icon";

export type CheckProps = {
	id: string;
	name: string;
	label: string;
	checked?: boolean;
	__internalId: string;
	onChange?: boolean;
	style?: {
		label?: CSSProperties;
		container?: CSSProperties;
		checkbox?: CSSProperties;
	};
};

type HandledEvents = Partial<{
	onChange: (event: ChangeEvent<HTMLInputElement>) => void;
}>;

export function Check({
	id,
	name,
	label,
	__internalId,
	checked,
	style,
	...props
}: Readonly<CheckProps>) {
	const { send } = useNubeSDK("checkout");
	const [isChecked, setIsChecked] = useState(checked ?? false);
	const handlers: HandledEvents = {};

	const handler = (value: boolean): DeepPartial<NubeSDKRuntimeState> =>
		({
			ui: {
				values: {
					[__internalId]: value,
				},
			},
		}) as unknown as DeepPartial<NubeSDKRuntimeState>; // TODO: Remove this cast then fix on types

	handlers.onChange = () => {
		const value = !isChecked;
		setIsChecked(value);
		if (props.onChange) {
			send(`custom:check:${__internalId}:change`, () => handler(value));
		}
	};

	return (
		<div
			className="nube-check form-group"
			style={style?.container}
			id={__internalId}
		>
			<label
				style={style?.label}
				className="form-checkbox form-options-label"
				htmlFor={`${__internalId}-input`}
			>
				<input
					id={`${__internalId}-input`}
					type="checkbox"
					name={name}
					style={style?.checkbox}
					data-component-id={id}
					checked={isChecked}
					{...handlers}
				/>
				<div className="form-options-content">
					<span className="form-group-icon">
						<Icon name="square" size={17} className="unchecked" />
						<Icon name="squareChecked" size={17} className="checked" />
					</span>
					<span className="form-options-label" style={style?.label}>
						{label}
					</span>
				</div>
			</label>
		</div>
	);
}
