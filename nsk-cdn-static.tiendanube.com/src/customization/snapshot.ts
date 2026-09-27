import type { CustomizationTarget } from "@tiendanube/nube-sdk-internal-types";

/**
 * Pristine values, per element and target — the host's own value, as read
 * before the FIRST mutation of that element.
 *
 * It has to be the pristine value rather than "the previous value": two
 * consecutive `set`s from the same app, or two apps writing the same target,
 * would otherwise snapshot a value the SDK itself had written, and reset
 * would restore a customization instead of the original.
 *
 * A `WeakMap` keeps no reference to nodes the host has discarded (every
 * re-render on the checkout replaces them), so nothing here leaks. Reset does
 * not iterate this map — it re-queries the selector and looks up the elements
 * that are actually on the page.
 */
const pristine = new WeakMap<Element, Map<CustomizationTarget, object>>();

/** Store the pristine options for `element`, only the first time. */
export function remember(
	element: Element,
	target: CustomizationTarget,
	options: object,
): void {
	let byTarget = pristine.get(element);
	if (!byTarget) {
		byTarget = new Map();
		pristine.set(element, byTarget);
	}
	if (byTarget.has(target)) return;
	byTarget.set(target, options);
}

/** Pristine options for `element`, or `undefined` if never customized. */
export function recall(
	element: Element,
	target: CustomizationTarget,
): object | undefined {
	return pristine.get(element)?.get(target);
}

/** Drop the snapshot after restoring it, so the next `set` re-reads it. */
export function forget(element: Element, target: CustomizationTarget): void {
	const byTarget = pristine.get(element);
	if (!byTarget) return;
	byTarget.delete(target);
	if (byTarget.size === 0) pristine.delete(element);
}
