/**
 * combine css class names conditionally
 * replaces the external dependency 'classnames' with a simple implementation
 */

type ClassValue = string | number | boolean | undefined | null;
type ClassObject = Record<string, ClassValue>;
type ClassInput = ClassValue | ClassObject | ClassInput[];

/**
 * combine multiple class values into a single css class string
 *
 * @param inputs - class values to combine
 * @returns string with combined css classes
 *
 * @example
 * classNames('foo', 'bar'); // 'foo bar'
 * classNames('foo', { bar: true, baz: false }); // 'foo bar'
 * classNames('foo', { bar: true }, 'baz'); // 'foo bar baz'
 * classNames(['foo', 'bar']); // 'foo bar'
 */
export function classNames(...inputs: ClassInput[]): string {
	const classes: string[] = [];

	for (const input of inputs) {
		// handle falsy values - only skip null, undefined, false, and empty string
		// but keep 0 as it should be included
		if (
			input === null ||
			input === undefined ||
			input === false ||
			input === ""
		) {
			continue;
		}

		if (typeof input === "string" || typeof input === "number") {
			classes.push(String(input));
		} else if (Array.isArray(input)) {
			const nestedResult = classNames(...input);
			if (nestedResult) {
				classes.push(nestedResult);
			}
		} else if (typeof input === "object") {
			for (const [key, value] of Object.entries(input)) {
				if (value) {
					classes.push(key);
				}
			}
		}
	}

	return classes.join(" ");
}
