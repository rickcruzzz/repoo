// Straight from `./contrast`, not the barrel: the barrel re-exports this file,
// so going through it would be a cycle.
import { parseColor } from "./contrast";

/** What the browser paints when nothing in the tree provides a background. */
const DEFAULT_CANVAS = "rgb(255, 255, 255)";

/**
 * The background colour the text of `element` actually sits on.
 *
 * Walks up from `element` until it finds an ancestor that paints something,
 * falling back to the default canvas at the root. Computed backgrounds always
 * serialize as `rgb()` / `rgba()`, so `parseColor` can read them.
 *
 * Simplification worth naming: the first non-transparent ancestor wins.
 * Stacked translucent layers are not blended, since the resulting ratio would
 * be approximate either way and the rule only needs to catch text that
 * vanishes.
 */
export function getEffectiveBackgroundColor(element: Element): string {
	let current: Element | null = element;

	while (current) {
		const background = getComputedStyle(current).backgroundColor;
		const parsed = parseColor(background);
		if (parsed && parsed.a > 0) return background;
		current = current.parentElement;
	}

	return DEFAULT_CANVAS;
}
