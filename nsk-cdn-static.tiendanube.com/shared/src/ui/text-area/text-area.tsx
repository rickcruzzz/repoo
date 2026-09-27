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

export type TextAreaProps = {
	id: string;
	name: string;
	label: string;
	maxLength?: number;
	autoFocus?: boolean;
	row?: number;
	value?: string;
	__internalId: string;
	onChange?: boolean;
	onBlur?: boolean;
	onFocus?: boolean;
	style?: {
		label?: CSSProperties;
		textarea?: CSSProperties;
		container?: CSSProperties;
	};
	mask?: string;
};

type HandledEvents = Partial<{
	onChange: (event: ChangeEvent<HTMLTextAreaElement>) => void;
	onFocus: (event: FocusEvent<HTMLTextAreaElement>) => void;
	onBlur: (event: FocusEvent<HTMLTextAreaElement>) => void;
}>;

export function TextArea({
	id,
	name,
	label,
	maxLength,
	row,
	__internalId,
	style,
	mask,
	...props
}: Readonly<TextAreaProps>) {
	const { send } = useNubeSDK("adapter");
	const [value, setValue] = useState(props.value || "");
	const prefix = `custom:txtarea:${__internalId}`;
	const handlers: HandledEvents = {};
	const inputRef = useRef<HTMLTextAreaElement>(null);

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
			className="nube-textarea form-group"
			style={style?.container}
			id={__internalId}
		>
			<label
				htmlFor={`${__internalId}-input`}
				className="opacity-80"
				style={style?.label}
			>
				{label}
			</label>
			<textarea
				ref={inputRef}
				rows={row}
				maxLength={maxLength}
				// biome-ignore lint/a11y/noAutofocus: autoFocus é necessário para experiência do usuário
				autoFocus={props.autoFocus}
				value={value}
				id={`${__internalId}-input`}
				style={style?.textarea}
				className="form-control m-top-quarter"
				placeholder=" "
				name={name}
				data-component-id={id}
				{...handlers}
			/>
		</div>
	);
}
