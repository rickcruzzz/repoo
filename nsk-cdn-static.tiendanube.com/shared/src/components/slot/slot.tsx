"use client";

import type { NubeSDKRuntimeState } from "@tiendanube/nube-sdk-internal-types";
import { useEffect, useState } from "@tiendanube/nube-sdk-react-runtime";
import type { UISlot } from "@tiendanube/nube-sdk-types";
import { DynamicRenderWithUI, type NubeComponent } from "../dynamic-render";

function isNubeComponent(value: unknown): value is NubeComponent {
	return (
		typeof value === "object" &&
		value !== null &&
		"type" in value &&
		typeof (value as NubeComponent).type === "string"
	);
}

function isNubeComponentArray(value: unknown): value is NubeComponent[] {
	return Array.isArray(value) && value.every((item) => isNubeComponent(item));
}

function isNubeComponentRecord(
	value: unknown,
): value is Record<string, NubeComponent> {
	return (
		typeof value === "object" &&
		value !== null &&
		!Array.isArray(value) &&
		!isNubeComponent(value) &&
		Object.values(value).every((item) => isNubeComponent(item))
	);
}

export type SlotProps = {
	id: UISlot;
	className?: string;
	disabledComponents?: string[];
	pick?: number | string;
	style?: React.CSSProperties;
};

/**
 * Resolves the actual component to render from a slot's stored content.
 *
 * Slot content can be a single component, an array, or a keyed record.
 * `pick` selects from arrays (by index) or records (by key); when omitted,
 * single components and the first element of arrays are returned for
 * backward compatibility.
 */
function resolveComponent(
	slotContent: unknown,
	pick?: number | string,
): NubeComponent | null {
	if (!slotContent) return null;

	if (pick === undefined) {
		if (isNubeComponent(slotContent)) return slotContent;
		if (isNubeComponentArray(slotContent)) return slotContent[0] || null;
		return null;
	}

	if (isNubeComponentArray(slotContent)) {
		const raw = typeof pick === "number" ? pick : Number(pick);
		const index = Number.isInteger(raw) ? raw : Number.NaN;
		const invalidIndex =
			!Number.isInteger(index) || index < 0 || index >= slotContent.length;

		if (invalidIndex) return null;

		return slotContent[index] || null;
	}

	if (isNubeComponentRecord(slotContent)) {
		return slotContent[String(pick)] || null;
	}

	if (isNubeComponent(slotContent)) return slotContent;

	return null;
}

/** Blocks ancestor React/JS handlers from firing. Does not affect browser default actions. */
function stopPropagation(event: React.SyntheticEvent) {
	event.stopPropagation();
}

/**
 * CSS selector for elements with native activation behavior. Used to detect
 * whether a click inside the slot subtree was aimed at an inner activatable
 * (in which case its default action must be preserved) or at non-interactive
 * content (in which case the outer ancestor's activation must be suppressed).
 *
 * Form controls are listed because their activation behavior is gated by the
 * click's canceled flag too: `preventDefault` stops `input[type="file"]` from
 * opening the file picker and reverts the checked state of checkboxes and
 * radios. `label[for]` forwards its click to the labelled control, and that
 * forwarded click bubbles back through this wrapper, so the control itself
 * must match the selector for the label path to work as well.
 */
const ACTIVATABLE_DESCENDANT_SELECTOR =
	'a[href], button:not([type="button"]), input[type="submit"], input[type="reset"], input[type="image"], input[type="file"], input[type="checkbox"], input[type="radio"], summary, label[for]';

/**
 * Slot click handler.
 *
 * `stopPropagation` blocks ancestor JS handlers but does NOT suppress the
 * browser's activation behavior on an ancestor `<a href>` or submit button —
 * that is gated solely by the event's canceled flag (`preventDefault`).
 *
 * `preventDefault` is called only when the click's activation target would
 * resolve to an ancestor outside the slot. If an activatable element exists
 * inside the slot subtree, it owns the activation and its default action is
 * preserved (e.g. internal `<a href>` navigation, `<summary>` toggle, form
 * submission).
 */
function handleSlotClick(event: React.MouseEvent<HTMLDivElement>) {
	event.stopPropagation();

	if (!event.cancelable) return;

	const wrapper = event.currentTarget;
	const target = event.target as Element | null;

	if (!target || typeof target.closest !== "function") {
		event.preventDefault();
		return;
	}

	const innerActivatable = target.closest(ACTIVATABLE_DESCENDANT_SELECTOR);
	const activatorIsInsideSlot =
		innerActivatable !== null &&
		innerActivatable !== wrapper &&
		wrapper.contains(innerActivatable);

	if (!activatorIsInsideSlot) {
		event.preventDefault();
	}
}

/**
 * Renders the SDK component currently assigned to `id`, subscribing to
 * `ui:slot:set` to update on subsequent changes.
 *
 * The wrapper attaches event handlers as JSX props (not via
 * `addEventListener`) so React's delegated dispatch reaches descendants. A
 * native listener on the wrapper that called `stopPropagation` would halt
 * the native bubble before it reached the React root and break `onClick` on
 * every slot descendant.
 */
export function Slot({
	id,
	pick,
	disabledComponents,
	className,
	style,
}: SlotProps) {
	const [state, setState] = useState<NubeSDKRuntimeState | null>(null);

	useEffect(() => {
		if (typeof window === "undefined" || !window?.nubeSDK) {
			return;
		}

		setState(window.nubeSDK.getState());

		const updateState = (newState: NubeSDKRuntimeState) => {
			setState(newState);
		};

		window.nubeSDK.on("ui:slot:set", updateState);

		return () => {
			window.nubeSDK?.off("ui:slot:set", updateState);
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const slotContent = state?.ui?.slots?.[id as UISlot];
	const component = resolveComponent(slotContent, pick);

	if (!component) return null;

	return (
		<div
			className={className}
			data-slot={id}
			id={`nube-sdk-slot-${id}`}
			style={style}
			onClick={handleSlotClick}
			onMouseDown={stopPropagation}
			onMouseUp={stopPropagation}
			onTouchStart={stopPropagation}
			onTouchEnd={stopPropagation}
			onPointerDown={stopPropagation}
			onPointerUp={stopPropagation}
			onKeyDown={stopPropagation}
			onKeyUp={stopPropagation}
			onKeyPress={stopPropagation}
		>
			<DynamicRenderWithUI
				component={component}
				disabledComponents={disabledComponents}
			/>
		</div>
	);
}
