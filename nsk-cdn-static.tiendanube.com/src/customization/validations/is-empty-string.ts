/**
 * True when `input` carries no visible character.
 *
 * Whitespace-only counts as empty: a button labelled `"   "` is as broken for
 * a shopper as one labelled `""`.
 */
export function isEmptyString(input: string): boolean {
	return input.trim().length === 0;
}
