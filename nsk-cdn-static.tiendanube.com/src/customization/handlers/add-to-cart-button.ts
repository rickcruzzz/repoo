import {
	contrastRefusal,
	getEffectiveBackgroundColor,
	isEmptyString,
} from "../validations";
import type { CustomizationHandler } from "./types";

/**
 * The storefront's add-to-cart button.
 *
 * `.js-addtocart` is in 29 of the 40 Core themes, as an
 * `<input type="submit">` in most of them and a `<button>` in some (e.g.
 * `flex`), hence the per-instance narrowing below.
 *
 * @see ./README.md
 */
export const addToCartButton: CustomizationHandler<"add-to-cart-button"> = {
	host: "storefront",
	selector: ".js-addtocart",

	read(element) {
		return {
			text:
				element instanceof HTMLInputElement
					? element.value
					: element.textContent ?? "",
			// The inline colour, so restoring `""` hands the element back to the
			// theme instead of pinning a colour the theme never set.
			fontColor: element instanceof HTMLElement ? element.style.color : "",
		};
	},

	operation(element, options) {
		if (options.text !== undefined) {
			if (element instanceof HTMLInputElement) {
				element.value = options.text;
				const label = element.querySelector(".js-addtocart-text");
				if (label) label.textContent = options.text;
			}
		}

		if (options.fontColor !== undefined && element instanceof HTMLElement) {
			element.style.color = options.fontColor;
		}
	},

	validate(element, options) {
		if (options.text !== undefined && isEmptyString(options.text)) {
			return 'refused "text": a button label cannot be blank';
		}

		// Clearing the inline colour is legitimate and has no contrast to
		// judge. It is also what `read` snapshots on a virgin element.
		if (options.fontColor !== undefined && options.fontColor !== "") {
			// Also refuses an unsupported notation on its own: the contrast
			// check has to be able to evaluate the colour, and one it cannot
			// evaluate cannot be shown to keep the label readable.
			const refusal = contrastRefusal(
				options.fontColor,
				getEffectiveBackgroundColor(element),
			);
			if (refusal) return `refused "fontColor": ${refusal}`;
		}

		return null;
	},
};
