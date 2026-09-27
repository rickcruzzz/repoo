import {
	type DeepPartial,
	STOREFRONT_UI_SLOT,
	type UISlot,
} from "@tiendanube/nube-sdk-internal-types";

/**
 * Deprecated UI slot redirect for backward compatibility during migration.
 *
 * Apps that still send UI to old slot names (e.g. `after_add_to_cart_pdp`,
 * `before_price_pdp`) have their payload rewritten to the new slot names
 * so they keep working without code changes.
 *
 * **Removal:** This module is temporary. Remove it in the next major breaking
 * change (e.g. 1.0.0), when deprecated slot names will no longer be supported.
 *
 * @module redirect-deprecated-slot
 */

/**
 * Map from deprecated slot names to their current target slot.
 * Used to rewrite incoming `ui.slots` payloads for backward compatibility.
 *
 * @internal
 */
export const DEPRECATED_SLOT_REDIRECT = new Map<string, UISlot>();

DEPRECATED_SLOT_REDIRECT.set(
	STOREFRONT_UI_SLOT.AFTER_ADD_TO_CART_PDP,
	STOREFRONT_UI_SLOT.AFTER_PRODUCT_DETAIL_ADD_TO_CART,
);

DEPRECATED_SLOT_REDIRECT.set(
	STOREFRONT_UI_SLOT.BEFORE_ADD_TO_CART_PDP,
	STOREFRONT_UI_SLOT.BEFORE_PRODUCT_DETAIL_ADD_TO_CART,
);

DEPRECATED_SLOT_REDIRECT.set(
	STOREFRONT_UI_SLOT.BEFORE_PRICE_PDP,
	STOREFRONT_UI_SLOT.BEFORE_PRODUCT_DETAIL_PRICE,
);

DEPRECATED_SLOT_REDIRECT.set(
	STOREFRONT_UI_SLOT.AFTER_PRICE_PDP,
	STOREFRONT_UI_SLOT.AFTER_PRODUCT_DETAIL_PRICE,
);

DEPRECATED_SLOT_REDIRECT.set(
	STOREFRONT_UI_SLOT.CART_LINE_ITEM_TOP,
	STOREFRONT_UI_SLOT.BEFORE_LINE_ITEM,
);

DEPRECATED_SLOT_REDIRECT.set(
	STOREFRONT_UI_SLOT.BEFORE_START_CHECKOUT_BUTTON,
	STOREFRONT_UI_SLOT.BEFORE_GO_TO_CHECKOUT,
);

/**
 * Rewrites the changes payload so that deprecated slot keys in `ui.slots`
 * are replaced by their redirect target. Non-deprecated keys are unchanged.
 *
 * Part of the deprecated-slot migration path. Remove when targeting the next
 * major version (e.g. 1.0.0).
 *
 * @param changes - The worker message changes payload (e.g. `{ ui: { slots: { ... } } }`).
 *   If undefined or missing `ui.slots`, returns an empty object.
 * @param redirectMap - Optional map of deprecated slot name → target slot.
 *   Defaults to the built-in `DEPRECATED_SLOT_REDIRECT` map.
 * @returns A new changes object with the same shape and other properties preserved,
 *   but `ui.slots` keys rewritten according to the redirect map.
 */
export function redirectDeprecatedSlotContent<
	T extends { ui?: { slots?: Record<string, unknown> } },
>(
	changes: DeepPartial<T> | undefined,
	redirectMap: Map<string, UISlot> = DEPRECATED_SLOT_REDIRECT,
): DeepPartial<T> {
	if (!changes?.ui?.slots) return {};
	const slots = changes.ui.slots as Record<string, unknown>;
	const rewrittenSlots: Record<string, unknown> = {};
	for (const [slotKey, value] of Object.entries(slots)) {
		const targetKey = redirectMap.get(slotKey) ?? slotKey;
		const isDeprecatedAlias = redirectMap.has(slotKey) && slotKey !== targetKey;
		if (isDeprecatedAlias && Object.hasOwn(slots, targetKey)) continue;
		rewrittenSlots[targetKey] = value;
	}
	return {
		...changes,
		ui: {
			...changes.ui,
			slots: rewrittenSlots,
		},
	};
}
