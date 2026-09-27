import type { DeepPartial, Nullable } from "@tiendanube/nube-sdk-types";
import { jsonClone } from "./json-clone";

export function deepMerge<T extends {}>(
	current: T,
	modifier: DeepPartial<T>,
	exceptions: string[] = [],
	initialKey = "",
): Nullable<T> {
	if (modifier === null) return null;

	return Object.keys(modifier).reduce<T>((actual, key) => {
		const currentKey = initialKey ? `${initialKey}.${key}` : key;
		const currentKeyAny = initialKey ? `${initialKey}.*` : key;
		const property = actual[key as keyof T];
		const modifierProperty = modifier[key as keyof T];
		const isNested =
			property !== null &&
			!exceptions.includes(currentKey) &&
			!exceptions.includes(currentKeyAny) &&
			typeof property === "object" &&
			typeof modifierProperty === "object" &&
			!Array.isArray(property);

		return Object.assign(actual, {
			[key]: isNested
				? deepMerge(
						property,
						modifierProperty as DeepPartial<typeof property>,
						exceptions,
						currentKey,
					)
				: (modifierProperty as T[keyof T]),
		});
	}, jsonClone(current));
}
