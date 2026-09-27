import {
	useCallback,
	useEffect,
	useRef,
	useState,
} from "@tiendanube/nube-sdk-react-runtime";
import { type CSSProperties, type ReactNode, useContext } from "react";
import { Icon } from "../Icon/Icon";
import { FormContext } from "./form-context";
import {
	type ValidityStateKey,
	firstFailingValidityKey,
} from "./validity-keys";

type ValidityVisualState = "pristine" | "valid" | "invalid";

export type FormCheckboxProps = {
	id?: string;
	__internalId: string;
	name: string;
	label: string;
	checked?: boolean;
	value?: string;
	required?: boolean;
	disabled?: boolean;
	children?: ReactNode;
	style?: {
		container?: CSSProperties;
		label?: CSSProperties;
		checkbox?: CSSProperties;
	};
};

export function FormCheckbox({
	id,
	__internalId,
	name,
	label,
	checked: initialChecked,
	value,
	required,
	disabled,
	children,
	style,
}: Readonly<FormCheckboxProps>) {
	const inputRef = useRef<HTMLInputElement>(null);
	const [isChecked, setIsChecked] = useState(!!initialChecked);
	const [validityState, setValidityState] =
		useState<ValidityVisualState>("pristine");
	const [failingKey, setFailingKey] = useState<ValidityStateKey | null>(null);
	const formContext = useContext(FormContext);

	const validate = useCallback((): boolean => {
		const input = inputRef.current;
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
		setIsChecked(!!initialChecked);
		setValidityState("pristine");
		setFailingKey(null);
	}, [initialChecked]);

	useEffect(() => {
		if (!formContext) return undefined;
		formContext.registerField(__internalId, { validate, reset });
		return () => formContext.unregisterField(__internalId);
	}, [formContext, __internalId, validate, reset]);

	const handleBlur = () => {
		validate();
	};

	const handleChange = () => {
		setIsChecked((prev) => !prev);
		if (validityState !== "pristine") {
			// Re-validate on the next tick after `checked` is committed to the DOM.
			queueMicrotask(validate);
		}
	};

	const inputId = `${__internalId}-input`;

	return (
		<div
			className="nube-check form-group nube-form-checkbox"
			id={__internalId}
			data-component-id={id}
			data-validity-state={validityState}
			data-validity-error={
				validityState === "invalid" && failingKey ? failingKey : undefined
			}
			style={style?.container}
		>
			<label
				className="form-checkbox form-options-label"
				htmlFor={inputId}
				style={style?.label}
			>
				<input
					ref={inputRef}
					id={inputId}
					type="checkbox"
					name={name}
					value={value}
					checked={isChecked}
					required={required}
					disabled={disabled}
					style={style?.checkbox}
					onBlur={handleBlur}
					onChange={handleChange}
				/>
				<div className="form-options-content">
					<span className="form-group-icon">
						<Icon name="square" size={17} className="unchecked" />
						<Icon name="squareChecked" size={17} className="checked" />
					</span>
					<span className="form-options-label">{label}</span>
				</div>
			</label>
			{children}
		</div>
	);
}
