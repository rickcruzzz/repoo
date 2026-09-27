import type { NubeSDKRuntimeEvent } from "@tiendanube/nube-sdk-internal-types";
import { useState } from "@tiendanube/nube-sdk-react-runtime";
import type { CSSProperties, ChangeEvent } from "react";
import { classNames } from "../../helpers/class-names";
import { useNubeSDK } from "../../hooks/use-nube-sdk";
import { Icon } from "../Icon/Icon";

export type SelectProps = {
	id?: string;
	name: string;
	label: string;
	value?: string;
	disabled?: boolean;
	options: Array<{ value: string; label: string; disabled?: boolean }>;
	__internalId: string;
	onChange?: boolean;
	style?: {
		container?: CSSProperties;
		select?: CSSProperties;
		label?: CSSProperties;
	};
};

type HandledEvents = Partial<{
	onChange: (event: ChangeEvent<HTMLSelectElement>) => void;
}>;

export const Select = ({
	id: idProp,
	name,
	label,
	options,
	__internalId,
	disabled,
	value: initialValue,
	onChange,
	style,
}: SelectProps) => {
	const { send } = useNubeSDK("adapter");
	const [selectedValue, setSelectedValue] = useState(initialValue || "");
	const prefix = `custom:select:${__internalId}:change` as NubeSDKRuntimeEvent;
	const handlers: HandledEvents = {};

	const handler = (newValue: string) => ({
		ui: {
			values: {
				[__internalId]: newValue,
			},
		},
	});

	handlers.onChange = (event: ChangeEvent<HTMLSelectElement>) => {
		const { value } = event.target;
		setSelectedValue(value);
		if (onChange) {
			send(prefix, () => handler(value));
		}
	};

	const classSelect = classNames("form-control form-control-select", {
		disabled,
	});

	return (
		<div
			className="nube-select form-group"
			id={__internalId}
			style={style?.container}
		>
			<div className="has-float-label select-container">
				<select
					style={style?.select}
					className={classSelect}
					name={name}
					id={idProp ?? ""}
					value={selectedValue}
					disabled={disabled}
					{...handlers}
				>
					{options.map(({ value, label: text, disabled: optionDisabled }) => {
						const uniqueKey = `${value}-${text}`
							.replace(/\s+/g, "-")
							.toLowerCase();
						return (
							<option key={uniqueKey} value={value} disabled={optionDisabled}>
								{text}
							</option>
						);
					})}
				</select>
				<label htmlFor={idProp ?? ""} style={style?.label}>
					{label}
				</label>
				<div className="select-icon">
					<Icon name="angleDown" size={14} />
				</div>
			</div>
		</div>
	);
};
