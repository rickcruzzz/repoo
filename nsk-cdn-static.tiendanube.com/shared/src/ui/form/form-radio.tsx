import {
	useCallback,
	useEffect,
	useRef,
	useState,
} from "@tiendanube/nube-sdk-react-runtime";
import {
	type CSSProperties,
	type ChangeEvent,
	type ReactNode,
	useContext,
} from "react";
import { FormContext } from "./form-context";
import {
	type ValidityStateKey,
	firstFailingValidityKey,
} from "./validity-keys";

type ValidityVisualState = "pristine" | "valid" | "invalid";

export type FormRadioOption = {
	value: string;
	label: string;
};

export type FormRadioProps = {
	id?: string;
	__internalId: string;
	name: string;
	label: string;
	options: FormRadioOption[];
	value?: string;
	required?: boolean;
	disabled?: boolean;
	children?: ReactNode;
	style?: {
		container?: CSSProperties;
		label?: CSSProperties;
		option?: CSSProperties;
		radio?: CSSProperties;
	};
};

export function FormRadio({
	id,
	__internalId,
	name,
	label,
	options,
	value: initialValue,
	required,
	disabled,
	children,
	style,
}: Readonly<FormRadioProps>) {
	const firstInputRef = useRef<HTMLInputElement>(null);
	const [selectedValue, setSelectedValue] = useState(initialValue ?? "");
	const [validityState, setValidityState] =
		useState<ValidityVisualState>("pristine");
	const [failingKey, setFailingKey] = useState<ValidityStateKey | null>(null);
	const formContext = useContext(FormContext);

	const validate = useCallback((): boolean => {
		const input = firstInputRef.current;
		if (!input) return true;

		if (input.validity.valid) {
			setValidityState("valid");
			setFailingKey(null);
			return true;
		}

		setValidityState("invalid");
		setFailingKey(firstFailingValidityKey(input.validity));
		return false;
	}, []);

	const reset = useCallback(() => {
		setSelectedValue(initialValue ?? "");
		setValidityState("pristine");
		setFailingKey(null);
	}, [initialValue]);

	useEffect(() => {
		if (!formContext) return undefined;
		formContext.registerField(__internalId, { validate, reset });
		return () => formContext.unregisterField(__internalId);
	}, [formContext, __internalId, validate, reset]);

	const handleBlur = () => {
		validate();
	};

	const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
		setSelectedValue(event.target.value);
		if (validityState !== "pristine") {
			queueMicrotask(validate);
		}
	};

	const groupId = `${__internalId}-input`;
	const groupLabelId = `${__internalId}-label`;

	return (
		<div
			className="nube-radio form-group nube-form-radio"
			id={__internalId}
			data-component-id={id}
			data-validity-state={validityState}
			data-validity-error={
				validityState === "invalid" && failingKey ? failingKey : undefined
			}
			role="radiogroup"
			aria-labelledby={groupLabelId}
			style={style?.container}
		>
			<span id={groupLabelId} style={style?.label}>
				{label}
			</span>
			{options.map(({ value, label: optionLabel }, index) => {
				const inputId = `${groupId}-${index}`;
				return (
					<label key={value} htmlFor={inputId} style={style?.option}>
						<input
							ref={index === 0 ? firstInputRef : undefined}
							id={inputId}
							type="radio"
							name={name}
							value={value}
							checked={selectedValue === value}
							required={required}
							disabled={disabled}
							style={style?.radio}
							onBlur={handleBlur}
							onChange={handleChange}
						/>
						<span>{optionLabel}</span>
					</label>
				);
			})}
			{children}
		</div>
	);
}
