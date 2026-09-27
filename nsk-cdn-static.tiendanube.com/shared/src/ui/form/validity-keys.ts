/**
 * Subset of `ValidityState` keys we surface to consumers via
 * `Form.FieldError`'s `match` prop. Shared by `FormField`, `FormSelect`
 * and `FormCheckbox` so the controls don't import each other.
 */
export type ValidityStateKey =
	| "valueMissing"
	| "typeMismatch"
	| "tooShort"
	| "tooLong"
	| "patternMismatch"
	| "rangeOverflow"
	| "rangeUnderflow";

/**
 * Order in which native `ValidityState` flags are probed when a control
 * is invalid. `valueMissing` first because it's the most user-friendly
 * message; the rarer constraint failures come after.
 */
export const VALIDITY_KEYS: ValidityStateKey[] = [
	"valueMissing",
	"typeMismatch",
	"tooShort",
	"tooLong",
	"patternMismatch",
	"rangeOverflow",
	"rangeUnderflow",
];

/**
 * Returns the first failing key of a native `ValidityState` according
 * to the canonical order, or `null` when the value is valid.
 */
export function firstFailingValidityKey(
	validity: ValidityState,
): ValidityStateKey | null {
	return VALIDITY_KEYS.find((key) => validity[key]) ?? null;
}
