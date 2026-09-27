import type {
	NubeComponent,
	NubeComponentWithChildren,
	WorkerMessage,
} from "@tiendanube/nube-sdk-internal-types";
import { DEPRECATED_SLOT_REDIRECT } from "../worker/handler/slot-set/redirect-deprecated-slot";

function isNubeComponent(value: unknown): value is NubeComponent {
	if (typeof value === "string") return true;

	return (
		typeof value === "object" &&
		value !== null &&
		"type" in value &&
		typeof value.type === "string"
	);
}

type StyledComponent = {
	componentId: string;
	slot: string;
	styled: string;
};

function isStyledComponent(
	component: unknown,
): component is NubeComponent & { styled: string; __internalId: string } {
	if (!component) return false;
	const comp = component as NubeComponent & {
		styled: string;
		__internalId: string;
	};
	return (
		typeof comp !== "string" &&
		typeof comp.__internalId === "string" &&
		typeof comp.styled === "string"
	);
}

function processStyleComponent(
	slot: string,
	component: NubeComponent | string,
	styleds: StyledComponent[],
): void {
	if (isStyledComponent(component)) {
		styleds.push({
			componentId: component.__internalId,
			slot,
			styled: component.styled,
		});
	}

	if (
		typeof component !== "string" &&
		(component as NubeComponentWithChildren).children
	) {
		const children = (component as NubeComponentWithChildren).children;

		if (children) {
			if (Array.isArray(children)) {
				for (const child of children) {
					processStyleComponent(slot, child, styleds);
				}
			} else {
				processStyleComponent(slot, children, styleds);
			}
		}
	}
}

export function getStyledComponents(message: WorkerMessage): StyledComponent[] {
	const { changes } = message;
	if (!changes?.ui?.slots) return [];

	const styleds: StyledComponent[] = [];

	const slots = changes.ui.slots;

	for (const slot in slots) {
		const resolvedSlot = DEPRECATED_SLOT_REDIRECT.get(slot) ?? slot;
		const isDeprecatedAlias =
			DEPRECATED_SLOT_REDIRECT.has(slot) && slot !== resolvedSlot;
		if (isDeprecatedAlias && Object.hasOwn(slots, resolvedSlot)) continue;

		const component = slots[slot as keyof typeof slots];

		if (isNubeComponent(component)) {
			processStyleComponent(resolvedSlot, component, styleds);
			continue;
		}

		if (Array.isArray(component)) {
			for (const comp of component) {
				processStyleComponent(resolvedSlot, comp, styleds);
			}
		}
	}

	return styleds;
}
