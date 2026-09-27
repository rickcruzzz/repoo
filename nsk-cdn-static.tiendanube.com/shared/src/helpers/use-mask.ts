import { useEffect } from "@tiendanube/nube-sdk-react-runtime";
import type { RefObject } from "react";

type InputElement = HTMLInputElement | HTMLTextAreaElement;

// Mask definitions similar to imask.js
interface MaskDefinitions {
	[key: string]: {
		mask: RegExp;
		transform?: (char: string) => string;
	};
}

// Default mask definitions (compatible with imask.js)
const DEFAULT_DEFINITIONS: MaskDefinitions = {
	"0": { mask: /[0-9]/ }, // digits
	"9": { mask: /[0-9]/ }, // digits (legacy support)
	a: { mask: /[a-zA-Z]/ }, // letters
	A: { mask: /[a-zA-Z]/, transform: (char: string) => char.toUpperCase() }, // letters (uppercase)
	"*": { mask: /[a-zA-Z0-9]/ }, // alphanumeric
	"#": { mask: /[a-zA-Z0-9]/ }, // alphanumeric (alias)
};

// Mask options interface
interface MaskOptions {
	mask: string;
	definitions?: MaskDefinitions;
	lazy?: boolean;
	overwrite?: boolean | "shift";
	placeholderChar?: string;
	displayChar?: string;
}

// Convert string mask to MaskOptions for backward compatibility
const normalizeMaskOptions = (mask: string | MaskOptions): MaskOptions => {
	if (typeof mask === "string") {
		return { mask };
	}
	return mask;
};

const applyMask = (value: string, options: MaskOptions): string => {
	const { mask, definitions = DEFAULT_DEFINITIONS } = options;

	if (!mask || !value) return value;

	let maskedValue = "";
	let valueIndex = 0;

	for (let i = 0; i < mask.length && valueIndex < value.length; i++) {
		const maskChar = mask[i];
		const definition = maskChar ? definitions[maskChar] : undefined;

		if (definition) {
			// This is a placeholder character
			const inputChar = value[valueIndex];

			if (inputChar && definition.mask.test(inputChar)) {
				// Character matches the mask definition
				const transformedChar = definition.transform
					? definition.transform(inputChar)
					: inputChar;
				maskedValue += transformedChar;
				valueIndex++;
			} else {
				// Character doesn't match - skip it and try next
				valueIndex++;
				i--; // Stay on the same mask position
			}
		} else {
			// This is a literal character in the mask
			if (maskChar) {
				maskedValue += maskChar;

				// If the input has this literal character, skip it
				if (value[valueIndex] === maskChar) {
					valueIndex++;
				}
			}
		}
	}

	return maskedValue;
};

// Extract only valid characters based on mask definitions used in the mask
const extractValidChars = (value: string, options: MaskOptions): string => {
	const { mask, definitions = DEFAULT_DEFINITIONS } = options;
	let validChars = "";

	// Get only the mask definitions that are actually used in the mask pattern
	const usedDefinitions = new Set<string>();
	for (const char of mask) {
		if (definitions[char]) {
			usedDefinitions.add(char);
		}
	}

	for (const char of value) {
		// Check if character is valid for any used mask definition
		const isValidForUsedDefinition = Array.from(usedDefinitions).some(
			(defKey) => definitions[defKey]?.mask.test(char),
		);

		if (isValidForUsedDefinition) {
			validChars += char;
		}
	}

	return validChars;
};

// Helper function to update cursor position after mask application
const updateCursorPosition = (
	target: InputElement,
	oldValue: string,
	newValue: string,
	prevSelectionStart: number,
) => {
	if (newValue === oldValue) return;

	let newCursorPosition = prevSelectionStart;

	if (newValue.length > oldValue.length) {
		// If mask characters were added, adjust cursor position
		newCursorPosition = Math.min(
			newValue.length,
			prevSelectionStart + (newValue.length - oldValue.length),
		);
	} else if (newValue.length < oldValue.length) {
		// If characters were removed, adjust cursor position
		newCursorPosition = Math.max(
			0,
			prevSelectionStart - (oldValue.length - newValue.length),
		);
	}

	if (typeof target.setSelectionRange === "function") {
		target.setSelectionRange(newCursorPosition, newCursorPosition);
	}
};

// Helper function to dispatch React-compatible input event
const dispatchReactInputEvent = (target: InputElement) => {
	// Always use "input" for consistency with React
	const event = new Event("input", { bubbles: true });
	setTimeout(() => target.dispatchEvent(event), 0);
};

// Helper function to set input value using React's native setter when available
const setInputValue = (target: InputElement, value: string) => {
	const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
		target instanceof HTMLInputElement
			? window.HTMLInputElement.prototype
			: window.HTMLTextAreaElement.prototype,
		"value",
	)?.set;

	if (nativeInputValueSetter) {
		nativeInputValueSetter.call(target, value);
	} else {
		target.value = value;
	}
};

// Enhanced useMask hook - supports both numeric and alphanumeric masks with strings
export const useMask = (
	mask: string | undefined,
	inputRef: RefObject<InputElement>,
) => {
	useEffect(() => {
		if (!mask || !inputRef.current) {
			return;
		}

		const input = inputRef.current;

		let isProcessing = false;

		const handleInput = (event: Event) => {
			if (isProcessing) return;
			isProcessing = true;

			const target = event.target as InputElement;
			const oldValue = target.value;

			// Apply mask
			const options = normalizeMaskOptions(mask);
			const validChars = extractValidChars(target.value, options);
			const maskedValue = applyMask(validChars, options);

			// Update value and dispatch event if there's any change OR if going to/from empty
			if (maskedValue !== oldValue || oldValue === "" || maskedValue === "") {
				const prevSelectionStart =
					typeof target.selectionStart === "number" ? target.selectionStart : 0;

				setInputValue(target, maskedValue);
				updateCursorPosition(target, oldValue, maskedValue, prevSelectionStart);

				setTimeout(() => {
					dispatchReactInputEvent(target);
					isProcessing = false;
				}, 0);
			} else {
				isProcessing = false;
			}
		};

		input.addEventListener("input", handleInput);

		return () => {
			input.removeEventListener("input", handleInput);
		};
	}, [mask, inputRef]);
};

// Utility functions for compatibility with imask.js API
export const createMask = (options: MaskOptions) => {
	return {
		resolve: (value: string) => applyMask(value, options),
		unmaskedValue: (value: string) => extractValidChars(value, options),
	};
};

// Export types for external use
export type { MaskOptions, MaskDefinitions };
