import { useRef, useState } from "@tiendanube/nube-sdk-react-runtime";
import type { CSSProperties, ChangeEvent, FocusEvent } from "react";
import {
	handleBlur,
	handleChange,
	handleFocus,
	handleModifier,
} from "../../helpers/handlers";
import { useMask } from "../../helpers/use-mask";
import { useNubeSDK } from "../../hooks/use-nube-sdk";

export type FieldProps = {
	id: string;
	name: string;
	label: string;
	__internalId: string;
	autoFocus?: boolean;
	value?: string;
	disabled?: boolean;
	placeholder?: string;
	onChange?: boolean;
	onBlur?: boolean;
	onFocus?: boolean;
	mask?: string;
	style?: {
		container?: CSSProperties;
		label?: CSSProperties;
		input?: CSSProperties;
	};
};

type HandledEvents = Partial<{
	onChange: (event: ChangeEvent<HTMLInputElement>) => void;
	onFocus: (event: FocusEvent<HTMLInputElement>) => void;
	onBlur: (event: FocusEvent<HTMLInputElement>) => void;
}>;

export function Field({
	id,
	name,
	label,
	__internalId,
	style,
	mask,
	...props
}: Readonly<FieldProps>) {
	// TODO: get host app name
	const { send } = useNubeSDK("adapter");
	const [value, setValue] = useState(props.value || "");
	const prefix = `custom:field:${__internalId}`;
	const handlers: HandledEvents = {};
	const inputRef = useRef<HTMLInputElement>(null);

	useMask(mask, inputRef);

	const handler = handleModifier({ __internalId });

	handlers.onChange = handleChange(
		send,
		prefix,
		handler,
		setValue,
		Boolean(props.onChange),
	);

	if (props.onFocus) {
		handlers.onFocus = handleFocus(send, prefix, handler);
	}

	if (props.onBlur) {
		handlers.onBlur = handleBlur(send, prefix, handler);
	}

	return (
		<div
			className="nube-field form-group"
			id={__internalId}
			style={style?.container}
		>
			<div className="has-float-label">
				<input
					ref={inputRef}
					className="form-control"
					type="text"
					// biome-ignore lint/a11y/noAutofocus: autoFocus é necessário para experiência do usuário
					autoFocus={props.autoFocus}
					placeholder={props.placeholder}
					disabled={props.disabled}
					id={`${__internalId}-input`}
					name={name}
					style={style?.input}
					data-component-id={id}
					value={value}
					{...handlers}
				/>
				<label
					className="input-label"
					htmlFor={`${__internalId}-input`}
					style={style?.label}
				>
					{label}
				</label>
			</div>
		</div>
	);
}
