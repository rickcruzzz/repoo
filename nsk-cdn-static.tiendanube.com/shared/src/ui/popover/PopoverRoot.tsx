"use client";
import {
	useCallback,
	useEffect,
	useRef,
	useState,
} from "@tiendanube/nube-sdk-react-runtime";
import type { CSSProperties, ReactElement } from "react";
import * as ReactUtils from "react";

export type PopoverRootProps = {
	defaultOpen?: boolean;
	children: ReactElement | ReactElement[];
	style?: CSSProperties;
	__internalId?: string;
};

/**
 * Renders the `popover` root component.
 *
 * Acts as the wrapper that controls the visibility of its content. It owns the
 * open/closed state and shares it with the `PopoverButton` (trigger) and the
 * `PopoverContent` (floating content) by injecting `isOpen` and `onToggle`
 * into its children, following the same pattern used by the accordion.
 *
 * It also closes the popover on outside clicks and on the `Escape` key.
 */
export function PopoverRoot({
	children,
	defaultOpen = false,
	style,
	__internalId,
}: Readonly<PopoverRootProps>) {
	const [isOpen, setIsOpen] = useState(defaultOpen);
	const rootRef = useRef<HTMLDivElement>(null);

	const toggle = useCallback(() => setIsOpen((prev) => !prev), []);
	const close = useCallback(() => setIsOpen(false), []);

	useEffect(() => {
		if (!isOpen) {
			return undefined;
		}

		const root = rootRef.current;
		if (!root) {
			return undefined;
		}

		const handlePointerDown = (event: MouseEvent) => {
			if (!root.contains(event.target as Node)) {
				close();
			}
		};

		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape") {
				close();
			}
		};

		root.addEventListener("keydown", handleKeyDown);
		// Capture phase: the popover renders inside a Slot whose wrapper calls
		// `stopPropagation` on `mousedown` during the bubble phase, so clicks on
		// the slot area around the popover (outside the root) never reach a
		// bubble-phase document listener. The capture phase runs top-down before
		// the slot's bubble handler, so the outside-click is detected regardless.
		document.addEventListener("mousedown", handlePointerDown, true);

		if (!root.contains(document.activeElement)) {
			root.focus();
		}

		return () => {
			root.removeEventListener("keydown", handleKeyDown);
			document.removeEventListener("mousedown", handlePointerDown, true);
		};
	}, [isOpen, close]);

	return (
		<div
			className="nube-popover-root"
			style={style}
			id={__internalId}
			ref={rootRef}
			tabIndex={-1}
		>
			{ReactUtils.Children.map(children, (child) => {
				if (!ReactUtils.isValidElement(child)) {
					return child;
				}

				const childProps = child.props as {
					component?: Record<string, unknown>;
				};

				return ReactUtils.cloneElement(child, {
					component: {
						...childProps.component,
						isOpen,
						onToggle: toggle,
						onClose: close,
					},
				} as Partial<typeof childProps>);
			})}
		</div>
	);
}

PopoverRoot.displayName = "PopoverRoot";
