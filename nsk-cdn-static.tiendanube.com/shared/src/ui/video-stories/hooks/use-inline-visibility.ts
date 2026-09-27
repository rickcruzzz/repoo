import { useEffect, useState } from "@tiendanube/nube-sdk-react-runtime";
import type { RefObject } from "react";

/**
 * Play-on-visible: reports whether the in-flow anchor is at least half on screen,
 * so N stories on a page don't all decode at once. Always `false` when
 * `IntersectionObserver` is unavailable.
 */
export function useInlineVisibility(anchorRef: RefObject<Element>): boolean {
	const [visible, setVisible] = useState(false);

	useEffect(() => {
		if (typeof IntersectionObserver === "undefined") return;

		const el = anchorRef.current;

		if (!el) return;

		const obs = new IntersectionObserver(
			([entry]) => {
				if (!entry) return;

				setVisible(entry.isIntersecting && entry.intersectionRatio >= 0.5);
			},
			{ threshold: [0, 0.5, 1] },
		);
		obs.observe(el);

		return () => obs.disconnect();
	}, [anchorRef]);

	return visible;
}
