import { useEffect, useRef } from "@tiendanube/nube-sdk-react-runtime";

type FullscreenNavOptions = {
	open: boolean;
	onEscape: () => void;
	onPrev: () => void;
	onNext: () => void;
};

/**
 * While the fullscreen overlay is open: locks body scroll and wires keyboard nav
 * (Escape / ArrowLeft / ArrowRight). Handlers are read through a ref so the
 * listener binds once per open (not per render) while always calling the latest
 * closures — no stale `index` and no exhaustive-deps escape hatch.
 */
export function useFullscreenNav({
	open,
	onEscape,
	onPrev,
	onNext,
}: FullscreenNavOptions) {
	const handlers = useRef({ onEscape, onPrev, onNext });
	handlers.current = { onEscape, onPrev, onNext };

	useEffect(() => {
		if (!open || typeof document === "undefined") return;

		const prevOverflow = document.body.style.overflow;
		document.body.style.overflow = "hidden";

		const onKey = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				handlers.current.onEscape();

				return;
			}

			const t = e.target as HTMLElement;
			if (
				t.tagName === "INPUT" ||
				t.tagName === "TEXTAREA" ||
				t.tagName === "SELECT" ||
				t.isContentEditable
			) {
				return;
			}

			if (e.key === "ArrowRight") {
				e.preventDefault();
				handlers.current.onNext();
			} else if (e.key === "ArrowLeft") {
				e.preventDefault();
				handlers.current.onPrev();
			}
		};

		document.addEventListener("keydown", onKey);

		return () => {
			document.body.style.overflow = prevOverflow;
			document.removeEventListener("keydown", onKey);
		};
	}, [open]);
}
