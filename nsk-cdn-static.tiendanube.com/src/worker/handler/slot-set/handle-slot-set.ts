import type {
	AppUISlots,
	DeepPartial,
	NubeComponent,
	NubeComponentFragment,
	UISlot,
	UISlots,
	WorkerMessageHandlerFunc,
} from "@tiendanube/nube-sdk-internal-types";
import {
	CHECKOUT_UI_SLOT,
	STOREFRONT_UI_SLOT,
} from "@tiendanube/nube-sdk-internal-types";
import { redirectDeprecatedSlotContent } from "./redirect-deprecated-slot";

export const HANDLED_REPEATABLE_SLOTS = [
	STOREFRONT_UI_SLOT.PRODUCT_GRID_ITEM_IMAGE_TOP_RIGHT,
	STOREFRONT_UI_SLOT.PRODUCT_GRID_ITEM_IMAGE_TOP_LEFT,
	STOREFRONT_UI_SLOT.PRODUCT_GRID_ITEM_IMAGE_BOTTOM_RIGHT,
	STOREFRONT_UI_SLOT.PRODUCT_GRID_ITEM_IMAGE_BOTTOM_LEFT,
	STOREFRONT_UI_SLOT.PRODUCT_GRID_ITEM_IMAGE_TOP_CENTER,
	STOREFRONT_UI_SLOT.PRODUCT_GRID_ITEM_IMAGE_CENTER_LEFT,
	STOREFRONT_UI_SLOT.PRODUCT_GRID_ITEM_IMAGE_CENTER_RIGHT,
	STOREFRONT_UI_SLOT.PRODUCT_GRID_ITEM_IMAGE_BOTTOM_CENTER,
	STOREFRONT_UI_SLOT.PRODUCT_GRID_ITEM_IMAGE_CENTER_CENTER,
	STOREFRONT_UI_SLOT.AFTER_PRODUCT_GRID_ITEM_NAME,
	STOREFRONT_UI_SLOT.BEFORE_PRODUCT_GRID_ITEM_NAME,
	STOREFRONT_UI_SLOT.BEFORE_LINE_ITEM,
	CHECKOUT_UI_SLOT.AFTER_SHIPPING_DESCRIPTION,
	STOREFRONT_UI_SLOT.AFTER_PRODUCT_GRID_ITEM_PRICE,
	STOREFRONT_UI_SLOT.BEFORE_PRODUCT_GRID_ITEM_PRICE,
] as const;

type RepeatableSlot = (typeof HANDLED_REPEATABLE_SLOTS)[number];

/**
 * Checks if a given slot is a repeatable slot that should be handled with Record structure
 * @param slot - The slot name to check
 * @returns true if the slot is a repeatable slot, false otherwise
 */
export function isRepeatableSlot(slot: UISlot): boolean {
	return HANDLED_REPEATABLE_SLOTS.includes(slot as RepeatableSlot);
}

/**
 * Converts an array of NubeComponents to a Record<string, NubeComponent>
 * Components without a key property are ignored
 * @param components - Array of NubeComponents to convert
 * @returns Record where keys are component keys and values are components without the key property
 */
export function convertArrayToRecord(
	components: NubeComponent[],
): Record<string, NubeComponent> {
	return components.reduce(
		(acc, component) => {
			if (isNubeComponentWithKey(component)) {
				const { key, ...componentWithoutKey } = component;
				const k = typeof key === "number" ? String(key) : key;

				// Expected behavior: duplicate keys within the same array overwrite previous components
				// This allows apps to completely replace UI for a specific key
				acc[k] = componentWithoutKey;
			}
			return acc;
		},
		{} as Record<string, NubeComponent>,
	);
}

/**
 * Merges two Records of NubeComponents, wrapping conflicting keys in a fragment
 * When the same key exists in both records, components are wrapped in a fragment
 * @param a - First record to merge
 * @param b - Second record to merge
 * @returns New record with merged components, conflicts resolved with fragments
 */
function mergeRecords(
	a: Record<string, NubeComponent>,
	b: Record<string, NubeComponent>,
): Record<string, NubeComponent> {
	const result: Record<string, NubeComponent> = { ...a };

	for (const [key, component] of Object.entries(b)) {
		if (result[key]) {
			// Conflict detected - wrap both components in a fragment
			result[key] = wrapInFragment(result[key], component);
		} else {
			// No conflict - add component directly
			result[key] = component;
		}
	}

	return result;
}

/**
 * Converts a single NubeComponent to a Record<string, NubeComponent> for repeatable slots
 * If the component has a key, it's used as the record key, otherwise the component is ignored
 * @param component - Single NubeComponent to convert
 * @returns Record with the component, or empty record if component has no key
 */
function convertSingleComponentToRecord(
	component: NubeComponent,
): Record<string, NubeComponent> {
	if (isNubeComponentWithKey(component)) {
		const { key, ...componentWithoutKey } = component;
		return { [key]: componentWithoutKey };
	}
	return {};
}

function isSingleComponent(value: unknown): value is NubeComponent {
	return (
		typeof value === "object" &&
		value !== null &&
		"type" in value &&
		typeof value.type === "string"
	);
}

type Not<T, U> = T extends U ? never : T;
type NubeComponentWithKey = Not<
	{ key: string | number } & NubeComponent,
	string
>;

function isNubeComponentWithKey(value: unknown): value is NubeComponentWithKey {
	return (
		isSingleComponent(value) &&
		typeof value !== "string" &&
		"key" in value &&
		(typeof value.key === "string" || typeof value.key === "number")
	);
}

/**
 * Merges UI components from repeatable slots using Record structure
 * @param appui - UI components from the app (single component or array)
 * @param globalUi - Current global UI for this slot
 * @returns Merged Record with all components from both sources
 */

/**
 * Wraps one or more NubeComponents in a fragment component
 * @param components - Components to wrap in a fragment
 * @returns A fragment component containing all provided components
 */
function wrapInFragment(...components: NubeComponent[]): NubeComponentFragment {
	return {
		type: "fragment",
		children: [...components],
	} as NubeComponentFragment;
}

/**
 * Converts an array of NubeComponents to a Fragment for regular slots
 * This is a wrapper around wrapInFragment that spreads the array of components
 * @param components - Array of NubeComponents to wrap in a fragment
 * @returns A fragment component containing all provided components
 */
export function convertArrayToFragment(
	components: NubeComponent[],
): NubeComponentFragment {
	return wrapInFragment(...components);
}

/**
 * Checks if the changes object contains any UI slot modifications
 * @param changes - The changes object from the worker message
 * @returns true if there are UI slot changes, false otherwise
 */
function hasUISlot<T extends { ui?: { slots?: Record<string, unknown> } }>(
	changes?: DeepPartial<T>,
): boolean {
	return (
		Object.keys(
			(changes?.ui?.slots as Record<string, unknown> | undefined) ?? {},
		).length > 0
	);
}

/**
 * Normalizes UI changes made by an app
 * - Repeatable slots → converted to Record<string, NubeComponent>
 * - Non-repeatable slots → overwrites the slot value
 * - undefined → clears the slot
 * @param currentAppSlots - Estado atual dos slots do app
 * @param changedSlots - Slots sendo alterados pelo app
 * @returns Novo estado do app com as alterações aplicadas
 */
function parseAppSlots(
	currentAppSlots: AppUISlots = {},
	changedSlots: AppUISlots = {},
): AppUISlots {
	const updatedSlots = { ...currentAppSlots };

	for (const [slotKey, component] of Object.entries(changedSlots)) {
		const slot = slotKey as UISlot;

		// undefined can be sent by the app to clear a slot
		if (component === undefined) {
			updatedSlots[slot] = undefined;
			continue;
		}

		const isArray = Array.isArray(component);

		if (isRepeatableSlot(slot)) {
			// Repeatable slots only accept arrays or components with key
			updatedSlots[slot] = isArray
				? convertArrayToRecord(component)
				: isNubeComponentWithKey(component)
					? convertSingleComponentToRecord(component)
					: undefined;
			continue;
		}

		updatedSlots[slot] = component;
	}

	return updatedSlots;
}

export const handleSlotSet: WorkerMessageHandlerFunc = (
	{ app: appid, changes },
	state,
) => {
	const normalizedChanges = redirectDeprecatedSlotContent(changes);
	if (!hasUISlot(normalizedChanges)) return null; // cancel event propagation;

	const slotsChanged = normalizedChanges?.ui?.slots || {};
	const currentAppSlots = state.apps?.[appid]?.ui?.slots || {};
	const updatedAppSlots = parseAppSlots(currentAppSlots, slotsChanged);

	const activeSlots = new Set([
		...Object.keys(updatedAppSlots),
		...Object.keys(state.ui?.slots || {}),
	]) as Set<UISlot>;

	// combine all app ui

	const updatedUI: UISlots = {};

	const instaledApps = Object.keys(state.apps || {});

	for (const slot of activeSlots) {
		const allAppComponents: (
			| NubeComponent
			| NubeComponent[]
			| Record<string, NubeComponent>
		)[] = [];

		// Collect components from all apps for this slot, including the current app
		const allApps = new Set([...instaledApps, appid]);

		for (const currentAppId of allApps) {
			const appSlots =
				currentAppId === appid
					? updatedAppSlots
					: state.apps?.[currentAppId]?.ui?.slots || {};
			const components = appSlots?.[slot];

			if (components !== undefined) {
				allAppComponents.push(components);
			}
		}

		// Skip if no components found for this slot
		if (allAppComponents.length === 0) {
			continue;
		}

		// Merge components based on slot type
		if (isRepeatableSlot(slot)) {
			// For repeatable slots: merge Records
			let mergedRecord: Record<string, NubeComponent> = {};

			for (const components of allAppComponents) {
				if (Array.isArray(components)) {
					// Array of components - convert to record
					const recordFromArray = convertArrayToRecord(components);
					mergedRecord = mergeRecords(mergedRecord, recordFromArray);
				} else if (typeof components === "object" && components !== null) {
					if ("type" in components && typeof components.type === "string") {
						// Single component - convert to record if it has a key
						const recordFromComponent = convertSingleComponentToRecord(
							components as NubeComponent,
						);
						mergedRecord = mergeRecords(mergedRecord, recordFromComponent);
					} else {
						// Already a record - merge directly
						mergedRecord = mergeRecords(
							mergedRecord,
							components as Record<string, NubeComponent>,
						);
					}
				}
			}

			updatedUI[slot] = mergedRecord;
		} else {
			// For regular slots: combine all components in a fragment
			const allComponents: NubeComponent[] = [];

			for (const components of allAppComponents) {
				if (Array.isArray(components)) {
					allComponents.push(...components);
				} else if (
					typeof components === "object" &&
					components !== null &&
					"type" in components &&
					typeof components.type === "string"
				) {
					allComponents.push(components as NubeComponent);
				}
				// Skip Record types for regular slots as they shouldn't exist
			}

			if (allComponents.length === 1) {
				updatedUI[slot] = allComponents[0];
			} else if (allComponents.length > 1) {
				updatedUI[slot] = convertArrayToFragment(allComponents);
			}
		}
	}

	// Return updated state
	const result = {
		apps: {
			[appid]: {
				ui: {
					slots: updatedAppSlots,
					values: state.apps?.[appid]?.ui?.values || {},
				},
			},
		},
		ui: {
			slots: updatedUI,
			values: state.ui?.values || {},
		},
	};

	return result;
};
