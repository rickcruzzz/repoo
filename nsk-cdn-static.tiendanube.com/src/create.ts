import type {
	DeepPartial,
	LanguageKey,
	NubeSDKRuntime,
	NubeSDKRuntimeListener,
	NubeSDKRuntimeState,
} from "@tiendanube/nube-sdk-internal-types";
import { deepMerge } from "./deep-merge";
import { getDevtoolsHook } from "./devtools";
import { jsonClone } from "./json-clone";

const FULL_REPLACE_PATHS = ["location.page.data", "ui.slots"];

function buildAppUiSlotsRoute(appid: string): string {
	return `apps.${appid}.ui.slots`;
}

const EMPTY_STATE: NubeSDKRuntimeState = {
	cart: {
		id: "",
		validation: { status: "pending" },
		items: [],
		prices: {
			discount_coupon: 0,
			discount_gateway: 0,
			discount_promotion: 0,
			subtotal_without_taxes: 0,
			shipping: 0,
			subtotal: 0,
			total: 0,
		},
		// TODO: fix type check
		// @ts-ignore
		coupon: null,
	},
	config: {
		has_cart_validation: false,
		disable_shipping_more_options: false,
		handle_cart_before_update: false,
	},
	location: {
		url: "",
		// TODO: fix type check
		// @ts-ignore
		page: {},
		queries: {},
	},
	store: {
		id: 0,
		name: "",
		domain: "",
		currency: "",
		language: "" as LanguageKey,
		currency_details: {
			code: "",
			cents_separator: "",
			thousands_separator: "",
			display_long: "",
			display_short: "",
		},
		theme: "",
		quick_cart: false,
	},
	ui: {
		values: {},
		slots: {},
	},
	apps: {},
	shipping: {
		selected: null,
		options: [],
		custom_labels: {},
	},
	// TODO: fix type check
	// @ts-ignore
	customer: {
		contact: {
			email: null,
			name: null,
			phone: null,
			accepts_marketing: null,
			accepts_marketing_updated_at: null,
		},
		shipping_address: {
			zipcode: "",
			first_name: null,
			last_name: null,
			address: null,
			number: null,
			floor: null,
			locality: null,
			city: null,
			state: null,
			country: null,
			phone: null,
			between_street: null,
			reference: null,
		},
		billing_address: {
			zipcode: "",
			first_name: null,
			last_name: null,
			address: null,
			number: null,
			floor: null,
			locality: null,
			city: null,
			state: null,
			country: null,
			phone: null,
			id_number: null,
			customer_type: null,
			business_name: null,
			trade_name: null,
			state_registration: null,
			fiscal_regime: null,
			invoice_use: null,
			document_type: null,
			business_activity: null,
		},
	},
	payment: {
		status: null,
		selected: null,
	},
};

export function createSDK(
	initialData: DeepPartial<NubeSDKRuntimeState>,
): NubeSDKRuntime {
	// Installs the devtools hook (when the extension announced itself) as
	// early as the runtime exists, so the panel can subscribe right after the
	// bundle loads instead of waiting for the first event to materialize it.
	getDevtoolsHook();

	const handlers = new Map<string, NubeSDKRuntimeListener[]>();
	let data: NubeSDKRuntimeState =
		deepMerge(EMPTY_STATE, initialData, FULL_REPLACE_PATHS) ?? EMPTY_STATE;

	return {
		on(event, listener) {
			const listeners = handlers.get(event) || [];
			handlers.set(event, [...listeners, listener]);
		},

		off(event, listener) {
			const listeners = handlers.get(event);

			if (listeners === undefined) return;

			handlers.set(
				event,
				listeners.filter((fn) => fn !== listener),
			);
		},

		send(appid, event, modifier, target) {
			// Devtools instrumentation. Resolved per dispatch (see
			// `getDevtoolsHook`) and left `undefined` on any store without the
			// extension, which is what keeps the snapshots below off the hot
			// path.
			const devtools = getDevtoolsHook();
			const prev = devtools ? jsonClone(data) : undefined;

			// whenever an event is sent the eventPayload is cleared
			data.eventPayload = null;

			if (modifier) {
				const result = deepMerge(data, modifier(data), [
					...FULL_REPLACE_PATHS,
					buildAppUiSlotsRoute(appid),
				]);
				if (result) data = result;
			}

			if (devtools && prev) {
				try {
					// Emitted before the listeners run, so a listener that
					// sends another event is recorded after the event that
					// caused it — the records read as a causal chain.
					devtools.emit({
						event,
						sender: appid,
						target,
						payload: data.eventPayload ?? undefined,
						prev,
						next: jsonClone(data),
						timestamp: Date.now(),
					});
				} catch (error) {
					// Instrumentation must never take the storefront down.
					console.error("NubeSDK devtools hook failed:", error);
				}
			}

			const eventListeners = handlers.get(event);

			if (eventListeners)
				for (const fn of eventListeners) fn(data, event, appid, target);

			const globalListeners = handlers.get("*");

			if (globalListeners)
				for (const fn of globalListeners) fn(data, event, appid, target);
		},

		getState() {
			return jsonClone(data);
		},
	};
}
