import { createContext } from "react";

export type FormFieldValidator = () => boolean;
export type FormFieldResetter = () => void;

export type FormFieldHooks = {
	validate: FormFieldValidator;
	reset: FormFieldResetter;
};

export type FormContextValue = {
	registerField: (id: string, hooks: FormFieldHooks) => void;
	unregisterField: (id: string) => void;
};

export const FormContext = createContext<FormContextValue | null>(null);
