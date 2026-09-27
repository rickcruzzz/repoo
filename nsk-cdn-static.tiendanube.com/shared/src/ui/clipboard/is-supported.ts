/**
 * Whether the async Clipboard API (`navigator.clipboard.writeText`) is usable
 * in the current environment. Guards `typeof navigator` so it is safe to call
 * during SSR / non-browser contexts (returns `false`).
 *
 * Used to decide whether a copy affordance should be shown at all: without
 * clipboard support the button can never copy, so it is hidden rather than
 * rendered as a no-op.
 */
export function isClipboardSupported(): boolean {
	return typeof navigator !== "undefined" && !!navigator.clipboard?.writeText;
}
