"use client";
import {
	useEffect,
	useRef,
	useState,
} from "@tiendanube/nube-sdk-react-runtime";
import type { MouseEvent } from "react";
import { toStyle } from "../../helpers/to-style";
import type { BoxProps } from "../../types";
import { usePopoverAlignment } from "./usePopoverAlignment";

type PopoverContentProps = BoxProps & {
	/** Accessible name for the dialog, announced by screen readers. */
	ariaLabel?: string;
	/** Injected by PopoverRoot. */
	isOpen?: boolean;
	/** Injected by PopoverRoot. Idempotent close (does not toggle). */
	onClose?: () => void;
};

/**
 * Matches the project-wide mobile breakpoint (`< 768px`). Below it, the popover
 * content is presented as a bottom sheet instead of an anchored panel.
 */
const MOBILE_MEDIA_QUERY = "(max-width: 767px)";

/**
 * Tracks whether the viewport is at mobile width. Lazily initialized from
 * `matchMedia` so the very first render already picks the right layout (no
 * desktop-panel flash before switching to the sheet). Falls back to `false`
 * when `matchMedia` is unavailable (SSR / jsdom), which keeps the anchored
 * desktop layout as the default.
 */
function useIsMobile(): boolean {
	const [isMobile, setIsMobile] = useState(
		() =>
			typeof window !== "undefined" &&
			typeof window.matchMedia === "function" &&
			window.matchMedia(MOBILE_MEDIA_QUERY).matches,
	);

	useEffect(() => {
		if (
			typeof window === "undefined" ||
			typeof window.matchMedia !== "function"
		) {
			return undefined;
		}

		const mql = window.matchMedia(MOBILE_MEDIA_QUERY);
		const update = () => setIsMobile(mql.matches);
		update();
		mql.addEventListener("change", update);
		return () => mql.removeEventListener("change", update);
	}, []);

	return isMobile;
}

/**
 * Renders the `popover` content component.
 *
 * Holds the floating content that becomes visible when the popover button is
 * clicked. Visibility is controlled by the `isOpen` flag injected by the
 * popover root.
 *
 * On desktop it mirrors the `box` styling and is anchored to the trigger via
 * absolute positioning. On mobile (`< 768px`) it is presented as a bottom
 * sheet rendered through the native `<dialog>` element: `showModal()` promotes
 * it to the browser's top layer, which escapes any ancestor stacking context,
 * `overflow: hidden` or `transform` — the reason the anchored panel could end
 * up rendered behind the storefront page on small screens.
 */
export function PopoverContent({
	__internalId,
	children,
	style,
	ariaLabel,
	isOpen = false,
	onClose,
	...options
}: Readonly<PopoverContentProps>) {
	const isMobile = useIsMobile();
	const dialogRef = useRef<HTMLDialogElement>(null);
	const contentRef = useRef<HTMLDivElement>(null);

	// Anchored desktop panel only: measure once it is open and decide whether it
	// opens right-aligned (default, growing left) or flips to left-aligned. The
	// bottom sheet is full-width, so alignment is irrelevant there.
	const alignment = usePopoverAlignment(contentRef, isOpen && !isMobile);

	// Promote the sheet to the top layer once it is mounted (it only mounts
	// while open). The `isMobile` dependency covers a desktop→mobile resize
	// while the popover is already open.
	useEffect(() => {
		if (!isMobile || !isOpen) {
			return;
		}

		const dialog = dialogRef.current;
		if (!dialog || typeof dialog.showModal !== "function" || dialog.open) {
			return;
		}

		dialog.showModal();
	}, [isMobile, isOpen]);

	if (!isOpen) {
		return null;
	}

	const customStyle = toStyle(options);

	if (isMobile) {
		// Tapping the backdrop (the dialog element itself, outside its content)
		// dismisses the sheet. Native `cancel`/`close` (Escape) is forwarded to
		// the root through `onClose` so React state stays in sync.
		const handleBackdropClick = (event: MouseEvent<HTMLDialogElement>) => {
			if (event.target === dialogRef.current) {
				dialogRef.current?.close();
			}
		};

		return (
			// biome-ignore lint/a11y/useKeyWithClickEvents: keyboard dismissal is handled natively by the modal `<dialog>` (Escape fires `cancel`/`close`); this only covers pointer taps on the backdrop.
			<dialog
				ref={dialogRef}
				className="nube-popover-content nube-popover-sheet"
				id={__internalId}
				aria-label={ariaLabel}
				style={{ ...customStyle, ...style }}
				onClose={() => onClose?.()}
				onClick={handleBackdropClick}
			>
				{children}
			</dialog>
		);
	}

	return (
		<div
			ref={contentRef}
			className="nube-popover-content"
			id={__internalId}
			role="dialog"
			aria-label={ariaLabel}
			data-align={alignment ?? "right"}
			// Hidden until the first measurement resolves the alignment, so the
			// panel never paints in the wrong spot before flipping.
			style={{
				visibility: alignment ? undefined : "hidden",
				...customStyle,
				...style,
			}}
		>
			{children}
		</div>
	);
}

PopoverContent.displayName = "PopoverContent";
