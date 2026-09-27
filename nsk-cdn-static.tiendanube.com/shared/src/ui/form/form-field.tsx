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

export type FormFieldInputType = "text" | "email" | "tel" | "number" | "file";

type ValidityVisualState = "pristine" | "valid" | "invalid";

export type FormFieldProps = {
	id?: string;
	__internalId: string;
	inputType: FormFieldInputType;
	name: string;
	label: string;
	value?: string;
	placeholder?: string;
	disabled?: boolean;
	required?: boolean;
	minLength?: number;
	maxLength?: number;
	pattern?: string;
	accept?: string;
	maxSize?: number;
	children?: ReactNode;
	style?: {
		container?: CSSProperties;
		label?: CSSProperties;
		input?: CSSProperties;
	};
};

export function FormField({
	id,
	__internalId,
	inputType,
	name,
	label,
	placeholder,
	value: initialValue,
	disabled,
	required,
	minLength,
	maxLength,
	pattern,
	accept,
	maxSize,
	children,
	style,
}: Readonly<FormFieldProps>) {
	const inputRef = useRef<HTMLInputElement>(null);
	const fileSizeExceededRef = useRef(false);
	const [validityState, setValidityState] =
		useState<ValidityVisualState>("pristine");
	const [failingKey, setFailingKey] = useState<ValidityStateKey | null>(null);
	const formContext = useContext(FormContext);

	const validate = useCallback((): boolean => {
		const input = inputRef.current;
		if (!input) return true;

		if (fileSizeExceededRef.current) {
			setValidityState("invalid");
			setFailingKey("rangeOverflow");
			return false;
		}

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
		fileSizeExceededRef.current = false;
		if (inputRef.current) {
			inputRef.current.value = initialValue ?? "";
		}
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
		if (inputType === "file" && maxSize !== undefined) {
			const file = event.target.files?.[0];
			fileSizeExceededRef.current = !!(file && file.size > maxSize);
		}

		if (validityState !== "pristine") {
			validate();
		}
	};

	const inputId = `${__internalId}-input`;

	return (
		<div
			className="nube-field form-group nube-form-field"
			id={__internalId}
			data-component-id={id}
			data-validity-state={validityState}
			data-validity-error={
				validityState === "invalid" && failingKey ? failingKey : undefined
			}
			style={style?.container}
		>
			<div className="has-float-label">
				<input
					ref={inputRef}
					className="form-control"
					id={inputId}
					name={name}
					type={inputType}
					placeholder={placeholder ?? " "}
					defaultValue={inputType === "file" ? undefined : initialValue}
					disabled={disabled}
					required={required}
					minLength={minLength}
					maxLength={maxLength}
					pattern={pattern}
					accept={inputType === "file" ? accept : undefined}
					style={style?.input}
					onBlur={handleBlur}
					onChange={handleChange}
				/>
				<label className="input-label" htmlFor={inputId} style={style?.label}>
					{label}
				</label>
			</div>
			{children}
		</div>
	);
}
