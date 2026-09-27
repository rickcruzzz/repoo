import { addToCartButton } from "./add-to-cart-button";
import type { CustomizationHandlerMap, ErasedHandler } from "./types";

// `CustomizationHandlerMap` stays internal: it only exists to type the catalog.
export type { CustomizationHandler, ErasedHandler } from "./types";

/**
 * The global, fixed catalog: one entry per file, so this list stays a table of
 * contents. The `CustomizationHandlerMap` annotation is what makes a missing
 * entry a compile error.
 *
 * @see ./README.md
 */
export const CUSTOMIZATION_HANDLERS: CustomizationHandlerMap = {
	"add-to-cart-button": addToCartButton,
};

// The single point where the catalog's precise typing is erased. Authoring
// stays fully checked against `CustomizationHandlerMap` above.
const ERASED = CUSTOMIZATION_HANDLERS as unknown as Record<
	string,
	ErasedHandler | undefined
>;

/**
 * Look up a target coming from an app. The own-key guard matters: targets
 * arrive as arbitrary strings, and a plain index would happily resolve
 * inherited keys such as `"toString"`.
 */
export function getHandler(target: string): ErasedHandler | undefined {
	if (!Object.prototype.hasOwnProperty.call(CUSTOMIZATION_HANDLERS, target)) {
		return undefined;
	}
	return ERASED[target];
}
