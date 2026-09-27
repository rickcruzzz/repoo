import { useEffect, useState } from "@tiendanube/nube-sdk-react-runtime";
import type { RefObject } from "react";

export type PopoverAlignment = "right" | "left";

/**
 * Decides how the anchored desktop panel lines up with its trigger.
 *
 * The preferred layout is right-aligned: the panel's right edge sits on the
 * trigger's right edge and the panel grows leftward ("from right to left"). It
 * only flips to left-aligned — left edge on the trigger, growing rightward —
 * when the right-aligned panel would overflow the left edge of the viewport
 * *and* the left-aligned layout actually fits. When neither side fits cleanly
 * the right-aligned preference is kept, since flipping to a layout that clips
 * just as badly helps nobody.
 *
 * Returns `undefined` until the first measurement so the caller can keep the
 * panel hidden and avoid a reposition flash on open.
 */
export function usePopoverAlignment(
	panelRef: RefObject<HTMLElement>,
	enabled: boolean,
): PopoverAlignment | undefined {
	const [alignment, setAlignment] = useState<PopoverAlignment>();

	useEffect(() => {
		if (!enabled) {
			setAlignment(undefined);
			return undefined;
		}

		const measure = () => {
			const panel = panelRef.current;
			const anchor = panel?.offsetParent as HTMLElement | null;
			if (!panel || !anchor) {
				setAlignment("right");
				return;
			}

			const anchorRect = anchor.getBoundingClientRect();
			const panelWidth = panel.offsetWidth;
			const viewportWidth =
				document.documentElement.clientWidth || window.innerWidth;

			const leftEdgeIfRightAligned = anchorRect.right - panelWidth;
			const rightEdgeIfLeftAligned = anchorRect.left + panelWidth;

			const overflowsLeft = leftEdgeIfRightAligned < 0;
			const leftAlignedFits = rightEdgeIfLeftAligned <= viewportWidth;

			setAlignment(overflowsLeft && leftAlignedFits ? "left" : "right");
		};

		measure();
		window.addEventListener("resize", measure);
		return () => window.removeEventListener("resize", measure);
	}, [panelRef, enabled]);

	return alignment;
}
