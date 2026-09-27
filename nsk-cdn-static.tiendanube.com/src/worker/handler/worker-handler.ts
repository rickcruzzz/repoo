import type {
	AppID,
	CartValidation,
	NubeFormActionEventData,
	NubeIframeMessageEventData,
	NubeNavigateEventData,
	NubeSDKRuntime,
	NubeSDKSendableEvent,
	NubeScrollToEventData,
	NubeSdkInternalEvent,
	NubeSdkInternalEventData,
	NubeStorageGetResponseEventData,
	NubeStorageId,
	NubeStorageQueryEventData,
	NubeStorageRemoveResponseEventData,
	NubeStorageSetEventData,
	NubeStorageSetResponseEventData,
	WorkerInternalMessage,
	WorkerMessage,
	WorkerMessageHandlerFunc,
} from "@tiendanube/nube-sdk-internal-types";
import { handleSlotSet } from "./slot-set";
import { handleTelemetry } from "./telemetry";
import type { WorkerTelemetryMessage } from "./telemetry/telemetry.ts";

export function parseCartValidation(value: unknown): CartValidation {
	const val = value as CartValidation | undefined;

	if (!val) return { status: "pending" };

	switch (val.status) {
		case "fail":
			if (typeof val.reason === "string")
				return { status: "fail", reason: val.reason };
			break;

		case "success":
			return { status: "success" };
	}

	return { status: "pending" };
}

export const handleCartAddCoupon: WorkerMessageHandlerFunc = (
	{ changes },
	state,
) => {
	const newCode = changes?.cart?.coupon?.code;
	const currentCode = state.cart?.coupon?.code;

	if (newCode === undefined || newCode === currentCode) {
		return null;
	}

	return {
		cart: {
			coupon: {
				code: newCode,
			},
		},
	};
};

export const handleCartRemoveCoupon: WorkerMessageHandlerFunc = (
	{ changes },
	state,
) => {
	const currentCode = state.cart?.coupon?.code;
	return !currentCode || changes ? null : {};
};

export const handleAccountRegister: WorkerMessageHandlerFunc = ({
	changes,
}) => ({
	customer: {
		name: changes?.customer?.name,
		email: changes?.customer?.email,
		phone: changes?.customer?.phone,
		cpf_cnpj: changes?.customer?.cpf_cnpj,
	},
});

export const handleShippingSelection: WorkerMessageHandlerFunc = (
	{ changes },
	{ shipping },
) => {
	if (changes?.shipping?.selected === shipping?.selected) return null;

	const selectedOption = changes?.shipping?.selected;

	if (!selectedOption) return null;

	const hasValidOption = Boolean(
		shipping?.options?.find((option) => option.code === selectedOption),
	);

	if (!hasValidOption) return null;

	return {
		shipping: {
			options: shipping?.options || [],
			custom_labels: shipping?.custom_labels || {},
			selected: selectedOption,
		},
	};
};

export const handleConfigSet: WorkerMessageHandlerFunc = ({
	app,
	changes,
}) => ({
	apps: {
		[app]: {
			config: {
				handle_cart_before_update:
					changes?.config?.handle_cart_before_update || false,
				has_cart_validation: changes?.config?.has_cart_validation || false,
				disable_shipping_more_options:
					changes?.config?.disable_shipping_more_options || false,
			},
		},
	},
});

export const handleWebWorkerError: WorkerMessageHandlerFunc = (
	{ app, error },
	state,
) => {
	const currentErrors = state.apps?.[app]?.errors || [];
	const newErrors = error ? [...currentErrors, error] : currentErrors;

	return {
		apps: {
			[app]: {
				errors: newErrors,
			},
		},
	};
};

export const handleCartValidation: WorkerMessageHandlerFunc = ({
	app,
	changes,
}) => ({
	apps: {
		[app]: {
			cart: {
				validation: parseCartValidation(changes?.cart?.validation),
			},
		},
	},
});

export const handleOrderExtra: WorkerMessageHandlerFunc = (
	{ changes },
	{ order },
) => {
	const extra = changes?.order?.extra;

	if (!extra) return null;

	return {
		order: { ...order, extra },
	};
};

const handlers = new Map<
	NubeSDKSendableEvent | "WebWorkerError",
	WorkerMessageHandlerFunc
>([
	["config:set", handleConfigSet],
	["cart:validate", handleCartValidation],
	["coupon:add", handleCartAddCoupon],
	["coupon:remove", handleCartRemoveCoupon],
	["shipping:select", handleShippingSelection],
	["ui:slot:set", handleSlotSet],
	["account:register", handleAccountRegister],
	["order:add:extra", handleOrderExtra],
	["WebWorkerError", handleWebWorkerError],
]);

export function createWorkerMessageHandler(
	handlers: Map<
		NubeSDKSendableEvent | "WebWorkerError",
		WorkerMessageHandlerFunc
	>,
) {
	return (message: WorkerMessage, runtime: NubeSDKRuntime) => {
		const { app, type, changes } = message;
		const handler = handlers.get(type);

		if (handler) {
			const state = runtime.getState();
			const result = handler(message, state);
			if (result) {
				runtime.send(app, type, () => result);
			}
			return;
		}

		if (changes) {
			runtime.send(app, type, () => changes);
			return;
		}

		runtime.send(app, type);
	};
}

export const workerMessageHandler = createWorkerMessageHandler(handlers);

export type WorkerInternalMessageOptions = {
	localStorage: Storage;
	sessionStorage: Storage;
};

export function buildAppStorageKey(appId: AppID, key: string) {
	return `app-${appId}-${key}`;
}

export function encodeAppStorageValue(
	value: string | null,
	ttl?: number,
	now: number = Date.now(),
) {
	const data = {
		value,
		...(ttl !== undefined ? { ttl: now + ttl * 1000 } : {}),
	};
	return JSON.stringify(data);
}

export function decodeAppStorageValue(
	storageValue: string | null,
	now = Date.now(),
): string | null {
	if (!storageValue) return null;
	try {
		const data = JSON.parse(storageValue);

		if (!data) {
			return null;
		}

		if (typeof data !== "object") {
			console.error(
				"Invalid value stored in storage, maybe it was modified from outside the SDK",
				storageValue,
			);
			return null;
		}

		if (data?.ttl) {
			// Has expiration date, validate
			if (typeof data.ttl !== "number") {
				console.error(
					"Invalid value stored in storage, maybe it was modified from outside the SDK",
					storageValue,
				);
				return null;
			}
			const isExpired = !!data.ttl && data.ttl < now;
			if (isExpired) return null;
		}

		if (data.value && typeof data.value !== "string") {
			console.error(
				"Invalid value stored in storage, maybe it was modified from outside the SDK",
				storageValue,
			);
			return null;
		}

		if (data.value === undefined) return null;

		return data.value;
	} catch (err) {
		console.error(
			"Invalid value stored in storage, maybe it was modified from outside the SDK",
			storageValue,
			err,
		);
		return null;
	}
}

export function isInternalUrl(
	url: string,
	baseUrl: string,
): {
	status: boolean;
	error?: string;
} {
	try {
		if (url.startsWith("http://") || url.startsWith("https://")) {
			const urlObj = new URL(url);
			const baseUrlObj = new URL(baseUrl);

			if (urlObj.hostname !== baseUrlObj.hostname) {
				return {
					status: false,
					error: "External URL detected",
				};
			}

			if (
				urlObj.pathname === baseUrlObj.pathname &&
				urlObj.search === baseUrlObj.search
			) {
				return {
					status: false,
					error: "Already on target URL",
				};
			}

			return { status: true };
		}

		if (!url.startsWith("/") && !url.startsWith("./")) {
			return {
				status: false,
				error: "Invalid relative URL format",
			};
		}

		const normalizedUrl = new URL(url, baseUrl);
		const normalizedBaseUrl = new URL(baseUrl);

		if (
			normalizedUrl.pathname === normalizedBaseUrl.pathname &&
			normalizedUrl.search === normalizedBaseUrl.search
		) {
			return {
				status: false,
				error: "Already on target URL",
			};
		}

		return { status: true };
	} catch {
		return {
			status: false,
			error: "Invalid URL format",
		};
	}
}

export function createWorkerTelemetryMessageHandler(): (
	sessionId: string,
	message: WorkerTelemetryMessage,
) => void {
	return (sessionId: string, message: WorkerTelemetryMessage) => {
		handleTelemetry(sessionId, message);
	};
}

export function createWorkerInternalMessageHandler(
	appId: AppID,
	worker: Worker,
	options: WorkerInternalMessageOptions,
): (message: WorkerInternalMessage, runtime: NubeSDKRuntime) => void {
	function getStorage(storageId: NubeStorageId) {
		switch (storageId) {
			case "session-storage":
				return options.sessionStorage;
			case "local-storage":
				return options.localStorage;
		}
	}

	function postMessage(
		eventId: NubeSdkInternalEvent,
		data: NubeSdkInternalEventData,
	) {
		worker.postMessage(
			JSON.stringify({
				type: eventId,
				data: data,
			}),
		);
	}

	function isEventStorageQueryEvent(event: WorkerInternalMessage): boolean {
		return (
			event.type === "internal:storage:get" ||
			event.type === "internal:storage:set" ||
			event.type === "internal:storage:remove"
		);
	}

	function isNavigateEvent(event: WorkerInternalMessage): boolean {
		return event.type === "internal:navigate";
	}

	function isIframeMessageEvent(event: WorkerInternalMessage): boolean {
		return event.type === "internal:iframe:message";
	}

	function isFormActionEvent(event: WorkerInternalMessage): boolean {
		return (
			event.type === "internal:form:submit" ||
			event.type === "internal:form:reset"
		);
	}

	/**
	 * Ownership check.
	 *
	 * `__internalId`s follow the pattern `<componentType>-<appId>-<hash>`
	 * (see `generateInternalId` in `@tiendanube/nube-sdk-ui`). The
	 * leading `<componentType>` segment is NOT a stable identifier — it
	 * comes from the factory's `.name` and differs between the unstyled
	 * `formRoot()` factory (`"formRoot"`) and `styled(Form.Root)`
	 * (`"FormRoot"`, from the JSX wrapper's function name). Pinning the
	 * check on the prefix string was the bug — other event-driven
	 * components (`Field`, `Select`, `Button`, …) never inspect the id
	 * prefix, they just key off `state.ui.values[__internalId]`.
	 *
	 * The reliable ownership signal is the `<appId>` segment between the
	 * type prefix and the trailing hash. We anchor the regex to the end
	 * of the id and only require the segment to match `message.app` —
	 * the same shape `generateInternalId` itself uses when reusing
	 * inbound ids. The DOM `instanceof HTMLFormElement` check below is
	 * what enforces "this id resolves to a form".
	 */
	function ownsForm(formId: string, owner: AppID): boolean {
		const escapedOwner = owner.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
		return new RegExp(`-${escapedOwner}-[a-z0-9]+$`).test(formId);
	}

	function isScrollToEvent(event: WorkerInternalMessage): boolean {
		return event.type === "internal:page:scroll_to";
	}

	return (message, runtime) => {
		if (isNavigateEvent(message)) {
			const data = message.data as NubeNavigateEventData;
			const route = data.route;
			const { url } = runtime.getState().location;

			const result = isInternalUrl(route, url);
			if (result.status) {
				window.location.href = route;
				return;
			}

			runtime.send("checkout", "WebWorkerError", () => ({
				apps: {
					[appId]: {
						errors: [
							...(runtime.getState().apps?.[appId]?.errors || []),
							{
								code: "navigation_error",
								message: result.error,
							},
						],
					},
				},
			}));
		}

		if (isEventStorageQueryEvent(message)) {
			const data = message.data as NubeStorageQueryEventData;
			const storage = getStorage(data.storageId);
			const storageKey = buildAppStorageKey(appId, data.key);

			switch (message.type) {
				case "internal:storage:get": {
					const storageValue = storage.getItem(storageKey);
					const value = decodeAppStorageValue(storageValue);
					const response: NubeStorageGetResponseEventData = {
						storageId: data.storageId,
						key: data.key,
						requestId: data.requestId,
						value,
					};
					postMessage("internal:storage:get:response", response);
					break;
				}

				case "internal:storage:set": {
					const setEventData = data as NubeStorageSetEventData;
					const finalValue = encodeAppStorageValue(
						setEventData.value,
						setEventData.ttl,
					);
					try {
						storage.setItem(storageKey, finalValue);
					} catch (err) {
						// Setting an item in storage can fail if the storage is full, we log the error but we don't propagate it to the worker.. maybe
						// this should be propagated?
						console.error(err);
					}
					const response: NubeStorageSetResponseEventData = {
						storageId: data.storageId,
						requestId: data.requestId,
					};
					postMessage("internal:storage:set:response", response);
					break;
				}

				case "internal:storage:remove": {
					storage.removeItem(storageKey);
					const response: NubeStorageRemoveResponseEventData = {
						storageId: data.storageId,
						requestId: data.requestId,
					};
					postMessage("internal:storage:remove:response", response);
					break;
				}
			}
		}

		if (isIframeMessageEvent(message)) {
			const data = message.data as NubeIframeMessageEventData;
			const iframe = document.getElementById(data.iframeId);
			const src = data.src;

			let targetOrigin: string | undefined;
			if (src) {
				try {
					targetOrigin = new URL(src).origin;
				} catch (error) {
					console.error("Error handling worker message: Invalid URL", {
						src,
						error,
					});
					targetOrigin = undefined;
				}
			}

			if (
				iframe &&
				iframe instanceof HTMLIFrameElement &&
				iframe.contentWindow &&
				targetOrigin
			) {
				let iframeOrigin: string | undefined;
				if (iframe.src) {
					try {
						iframeOrigin = new URL(iframe.src).origin;
					} catch (error) {
						console.error("Error handling worker message: Invalid iframe URL", {
							iframeSrc: iframe.src,
							error,
						});
					}
				}

				if (targetOrigin !== iframeOrigin) {
					console.error(
						"Error handling worker message: Target origin mismatch",
						{
							expected: iframeOrigin,
							got: targetOrigin,
							iframeId: data.iframeId,
						},
					);
					return;
				}

				iframe.contentWindow.postMessage(data.message, targetOrigin);
			}
		}

		if (isFormActionEvent(message)) {
			const data = message.data as NubeFormActionEventData;
			const { formId } = data;

			// Cross-app attempts are dropped — the event must address a form
			// owned by the same app that dispatched it. Logged so that an
			// honest mismatch (e.g. wrong appId in the formId prefix)
			// surfaces in the console instead of looking like dead code.
			if (!ownsForm(formId, message.app)) {
				console.error(
					`[nube-sdk] Form action "${message.type}" ignored: app "${message.app}" does not own form "${formId}".`,
				);
				return;
			}

			const form = document.getElementById(formId);
			if (!(form instanceof HTMLFormElement)) {
				return;
			}

			if (message.type === "internal:form:submit") {
				// `requestSubmit()` triggers the form's `submit` event, which is
				// already wired to `Form.Root`'s React handler — so validation,
				// fetch, and the JSON-encoded onChange payload all run as if a
				// `Form.Submitter` had been clicked.
				form.requestSubmit();
			} else {
				// `reset()` fires the native `reset` event, which `Form.Root`
				// listens to in order to walk the field-level reset hooks.
				form.reset();
			}
		}

		if (isScrollToEvent(message)) {
			const data = message.data as NubeScrollToEventData;
			window.scrollTo({
				top: data.top,
				left: data.left,
				behavior: data.behavior,
			});
		}
	};
}

export function createWorker(...parts: string[]): Worker {
	const blob = new Blob(parts, { type: "application/javascript" });
	const worker = new Worker(URL.createObjectURL(blob));
	return worker;
}
