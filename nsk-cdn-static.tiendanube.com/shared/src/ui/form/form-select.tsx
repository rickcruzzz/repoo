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
import { classNames } from "../../helpers/class-names";
import { Icon } from "../Icon/Icon";
import { FormContext } from "./form-context";
import {
	type ValidityStateKey,
	firstFailingValidityKey,
} from "./validity-keys";

type ValidityVisualState = "pristine" | "valid" | "invalid";

export type FormSelectOption = {
	value: string;
	label: string;
	disabled?: boolean;
};

export type FormSelectProps = {
	id?: string;
	__internalId: string;
	name: string;
	label: string;
	options: FormSelectOption[];
	value?: string;
	required?: boolean;
	disabled?: boolean;
	children?: ReactNode;
	style?: {
		container?: CSSProperties;
		label?: CSSProperties;
		select?: CSSProperties;
	};
};

export function FormSelect({
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
}: Readonly<FormSelectProps>) {
	const selectRef = useRef<HTMLSelectElement>(null);
	const [selectedValue, setSelectedValue] = useState(initialValue ?? "");
	const [validityState, setValidityState] =
		useState<ValidityVisualState>("pristine");
	const [failingKey, setFailingKey] = useState<ValidityStateKey | null>(null);
	const formContext = useContext(FormContext);

	const validate = useCallback((): boolean => {
		const select = selectRef.current;
		if (!select) return true;

		if (select.validity.valid) {
			setValidityState("valid");
			setFailingKey(null);
			return true;
		}

		setValidityState("invalid");
		setFailingKey(firstFailingValidityKey(select.validity));
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

	const handleChange = (event: ChangeEvent<HTMLSelectElement>) => {
		setSelectedValue(event.target.value);
		if (validityState !== "pristine") {
			validate();
		}
	};

	const inputId = `${__internalId}-input`;
	const selectClassName = classNames("form-control form-control-select", {
		disabled,
	});

	return (
		<div
			className="nube-select form-group nube-form-select"
			id={__internalId}
			data-component-id={id}
			data-validity-state={validityState}
			data-validity-error={
				validityState === "invalid" && failingKey ? failingKey : undefined
			}
			style={style?.container}
		>
			<div className="has-float-label select-container">
				<select
					ref={selectRef}
					id={inputId}
					name={name}
					className={selectClassName}
					value={selectedValue}
					required={required}
					disabled={disabled}
					style={style?.select}
					onBlur={handleBlur}
					onChange={handleChange}
				>
					{options.map(
						({ value, label: optionLabel, disabled: optionDisabled }) => (
							<option key={value} value={value} disabled={optionDisabled}>
								{optionLabel}
							</option>
						),
					)}
				</select>
				<label className="input-label" htmlFor={inputId} style={style?.label}>
					{label}
				</label>
				<div className="select-icon">
					<Icon name="angleDown" size={14} />
				</div>
			</div>
			{children}
		</div>
	);
}
