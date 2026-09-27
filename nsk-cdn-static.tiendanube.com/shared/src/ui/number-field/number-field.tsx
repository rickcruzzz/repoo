import type { NubeSDKRuntimeEvent } from "@tiendanube/nube-sdk-internal-types";
import { useRef, useState } from "@tiendanube/nube-sdk-react-runtime";
import type { CSSProperties, ChangeEvent, FocusEvent } from "react";
import {
	handleBlur,
	handleChange,
	handleFocus,
	handleModifier,
} from "../../helpers/handlers";
import { useNubeSDK } from "../../hooks/use-nube-sdk";

export type NumberFieldProps = {
	name: string;
	label: string;
	__internalId: string;
	value?: number;
	min?: number;
	max?: number;
	step?: number;
	disabled?: boolean;
	style?: {
		container?: CSSProperties;
		wrapper?: CSSProperties;
		label?: CSSProperties;
		input?: CSSProperties;
		decrementButton?: CSSProperties;
		incrementButton?: CSSProperties;
	};
	onChange?: boolean;
	onBlur?: boolean;
	onFocus?: boolean;
	onIncrement?: boolean;
	onDecrement?: boolean;
};

type HandledEvents = Partial<{
	onChange: (event: ChangeEvent<HTMLInputElement>) => void;
	onFocus: (event: FocusEvent<HTMLInputElement>) => void;
	onBlur: (event: FocusEvent<HTMLInputElement>) => void;
}>;

const INCREMENT = "increment";
const DECREMENT = "decrement";

type ChangeDirection = typeof INCREMENT | typeof DECREMENT;

export function NumberField({
	name,
	label,
	__internalId,
	value: initialValue,
	min,
	max,
	step = 1,
	disabled = false,
	style,
	onChange,
	onBlur,
	onFocus,
	onIncrement,
	onDecrement,
}: Readonly<NumberFieldProps>) {
	// TODO: get host app name
	const { send } = useNubeSDK("adapter");
	const [value, setValue] = useState(initialValue ?? 0);
	const prefix = `custom:numberfield:${__internalId}`;
	const handlers: HandledEvents = {};
	const inputRef = useRef<HTMLInputElement>(null);

	const handler = handleModifier({ __internalId });

	handlers.onChange = handleChange(
		send,
		prefix,
		handler,
		setValue,
		Boolean(onChange),
	);

	if (onFocus) {
		handlers.onFocus = handleFocus(send, prefix, handler);
	}

	if (onBlur) {
		handlers.onBlur = handleBlur(send, prefix, handler);
	}

	const updateValue = (direction: ChangeDirection) => {
		const delta = direction === INCREMENT ? step : -step;
		const shouldEmit = direction === INCREMENT ? onIncrement : onDecrement;
		const eventType = `${prefix}:${direction}` as NubeSDKRuntimeEvent;

		return () => {
			const current = Number(value);
			if (Number.isNaN(current)) return;
			const newValue = current + delta;

			const isOutOfRange =
				(direction === INCREMENT && max !== undefined && newValue > max) ||
				(direction === DECREMENT && min !== undefined && newValue < min);

			if (isOutOfRange) return;

			const modifier = () => ({
				ui: {
					values: {
						// TODO: fix type because by default input value is always string
						[__internalId]: String(newValue),
					},
				},
			});

			setValue(newValue);

			if (onChange) {
				send(`${prefix}:change` as NubeSDKRuntimeEvent, modifier);
			}

			if (shouldEmit) send(eventType, modifier);
		};
	};

	const handleIncrement = updateValue(INCREMENT);
	const handleDecrement = updateValue(DECREMENT);

	return (
		<div
			className="nube-number-field"
			id={__internalId}
			style={style?.container}
		>
			{label && (
				<label
					className="nube-number-field-label"
					htmlFor={`${__internalId}-input`}
					style={style?.label}
				>
					{label}
				</label>
			)}

			<div className="nube-number-field-wrapper" style={style?.wrapper}>
				<button
					type="button"
					className="nube-number-field-button nube-number-field-decrement"
					onClick={handleDecrement}
					disabled={disabled || (min !== undefined && value <= min)}
					style={style?.decrementButton}
					aria-label="Decrement value button"
				>
					−
				</button>

				<input
					ref={inputRef}
					className="nube-number-field-input"
					type="text"
					inputMode="numeric"
					pattern="[0-9.-]*"
					id={`${__internalId}-input`}
					name={name}
					style={style?.input}
					value={value}
					disabled={disabled}
					{...handlers}
				/>

				<button
					type="button"
					className="nube-number-field-button nube-number-field-increment"
					onClick={handleIncrement}
					disabled={disabled || (max !== undefined && value >= max)}
					style={style?.incrementButton}
					aria-label="Increment value button"
				>
					+
				</button>
			</div>
		</div>
	);
}
