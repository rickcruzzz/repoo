"use client";

import type { NubeSDKRuntimeEvent } from "@tiendanube/nube-sdk-internal-types";
import {
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "@tiendanube/nube-sdk-react-runtime";
import React, {
	type CSSProperties,
	type FormEvent,
	type ReactElement,
	type ReactNode,
} from "react";
import { useNubeSDK } from "../../hooks/use-nube-sdk";
import {
	FormContext,
	type FormContextValue,
	type FormFieldHooks,
} from "./form-context";

export type FormMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export type FormStatus = "idle" | "sending" | "success" | "failure";

export type FormRootProps = {
	id?: string;
	__internalId: string;
	method?: FormMethod;
	target: string;
	onChange?: boolean;
	onSuccess?: boolean;
	onFail?: boolean;
	children?: ReactNode;
	style?: CSSProperties;
};

/**
 * Builds a plain object snapshot of the form keyed by each field's `name`.
 * For `File` inputs only `file.name` is included — the underlying Blob is
 * never sent across the worker boundary (the values channel is
 * `Record<string, string>`).
 *
 * Exported so the file-name policy can be unit-tested without depending on
 * jsdom's incomplete file-input wiring inside `new FormData(form)`.
 */
export function gatherFormData(form: HTMLFormElement): Record<string, string> {
	const formData = new FormData(form);
	return gatherFormDataFromEntries(formData);
}

/**
 * Same logic as `gatherFormData`, but operates on a pre-built `FormData`
 * instance so tests can supply controlled inputs (including `File`s) and
 * verify the file-name policy directly.
 */
export function gatherFormDataFromEntries(
	formData: FormData,
): Record<string, string> {
	const data: Record<string, string> = {};
	formData.forEach((value, key) => {
		data[key] = value instanceof File ? value.name : value;
	});
	return data;
}

/**
 * HTTP methods that disallow a request body per the Fetch spec.
 * Sending `FormData` as `body` on these throws a `TypeError`.
 */
const BODYLESS_METHODS = new Set<FormMethod>(["GET"]);

export type FormFetchInit = {
	method: FormMethod;
	body?: FormData;
};

/**
 * Builds the `fetch` URL + init for a form submission. GET requests
 * cannot carry a body, so any non-file fields are encoded into the
 * query string instead; file fields are dropped (the dev should switch
 * to POST/PUT/PATCH if they need to upload a Blob).
 */
export function buildFetchRequest(
	target: string,
	method: FormMethod,
	formData: FormData,
): { url: string; init: FormFetchInit } {
	if (!BODYLESS_METHODS.has(method)) {
		return { url: target, init: { method, body: formData } };
	}

	const params = new URLSearchParams();
	formData.forEach((value, key) => {
		if (typeof value === "string") {
			params.append(key, value);
		}
	});
	const serialized = params.toString();
	const separator = target.includes("?") ? "&" : "?";
	const url = serialized ? `${target}${separator}${serialized}` : target;
	return { url, init: { method } };
}

/**
 * Trailing-edge debounce window for `onChange` events. Coalesces bursts
 * of native `change` events (e.g. rapid checkbox toggles, multi-keystroke
 * paste flows) into a single `send()` carrying the latest snapshot.
 */
export const FORM_CHANGE_DEBOUNCE_MS = 100;

const CONDITIONAL_TYPE_BY_STATUS: Record<
	Exclude<FormStatus, "idle">,
	string
> = {
	sending: "formSending",
	success: "formSuccess",
	failure: "formFailure",
};

const CONDITIONAL_TYPES = new Set(Object.values(CONDITIONAL_TYPE_BY_STATUS));

type DynamicChild = ReactElement<{
	component?: { type?: string };
}>;

/**
 * Detects whether a child element is one of the conditional containers.
 *
 * Two paths covered:
 *  - Real worker → main thread pipeline: each child arrives wrapped by
 *    `DynamicRender`, exposing the JSON tree type as
 *    `props.component.type` (e.g. `"formSuccess"`).
 *  - Direct React rendering (used by tests, dev tooling, anyone bypassing
 *    `DynamicRender`): each conditional component carries a static
 *    `__formConditionalType` marker on its function reference.
 */
function detectConditionalType(child: ReactElement): string | undefined {
	const dynamicType = (child as DynamicChild).props.component?.type;
	if (dynamicType && CONDITIONAL_TYPES.has(dynamicType)) return dynamicType;

	const directMarker = (child.type as { __formConditionalType?: string })
		.__formConditionalType;
	if (directMarker && CONDITIONAL_TYPES.has(directMarker)) return directMarker;

	return undefined;
}

/**
 * Splits the React children passed to `FormRoot` into "regular" content
 * vs the three conditional containers (`Form.Sending` / `Form.Success` /
 * `Form.Failure`).
 */
export function partitionChildren(children: ReactNode): {
	regular: ReactNode[];
	conditionals: Map<string, ReactNode>;
} {
	const regular: ReactNode[] = [];
	const conditionals = new Map<string, ReactNode>();

	React.Children.forEach(children, (child) => {
		if (!React.isValidElement(child)) {
			regular.push(child);
			return;
		}
		const conditionalType = detectConditionalType(child);
		if (conditionalType) {
			// Last one wins if the consumer accidentally provides two of the
			// same kind — matches React's natural "last sibling wins" mental
			// model for visible content.
			conditionals.set(conditionalType, child);
			return;
		}
		regular.push(child);
	});

	return { regular, conditionals };
}

export function FormRoot({
	id,
	__internalId,
	method = "POST",
	target,
	onChange,
	onSuccess,
	onFail,
	children,
	style,
}: Readonly<FormRootProps>) {
	const { send } = useNubeSDK("adapter");
	const fieldsRef = useRef<Map<string, FormFieldHooks>>(new Map());
	const changeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const pendingChangePayloadRef = useRef<string | null>(null);
	const [status, setStatus] = useState<FormStatus>("idle");
	const prefix = `custom:formRoot:${__internalId}`;

	const cancelPendingChange = useCallback(() => {
		if (changeTimerRef.current !== null) {
			clearTimeout(changeTimerRef.current);
			changeTimerRef.current = null;
		}
		pendingChangePayloadRef.current = null;
	}, []);

	// Clear any in-flight debounced change when the component unmounts.
	useEffect(
		() => () => {
			if (changeTimerRef.current !== null) {
				clearTimeout(changeTimerRef.current);
			}
		},
		[],
	);

	const registerField = useCallback(
		(fieldId: string, hooks: FormFieldHooks) => {
			fieldsRef.current.set(fieldId, hooks);
		},
		[],
	);

	const unregisterField = useCallback((fieldId: string) => {
		fieldsRef.current.delete(fieldId);
	}, []);

	const contextValue = useMemo<FormContextValue>(
		() => ({ registerField, unregisterField }),
		[registerField, unregisterField],
	);

	const handleChange = (event: React.ChangeEvent<HTMLFormElement>) => {
		if (!onChange) return;
		// Snapshot synchronously — `event.currentTarget` is wiped by React
		// once the handler returns, so we can't read it from the debounced
		// timer callback.
		const payload = JSON.stringify(gatherFormData(event.currentTarget));
		pendingChangePayloadRef.current = payload;

		if (changeTimerRef.current !== null) {
			clearTimeout(changeTimerRef.current);
		}
		changeTimerRef.current = setTimeout(() => {
			const queued = pendingChangePayloadRef.current;
			changeTimerRef.current = null;
			pendingChangePayloadRef.current = null;
			if (queued === null) return;
			send(`${prefix}:change` as NubeSDKRuntimeEvent, () => ({
				ui: {
					values: {
						[__internalId]: queued,
					},
				},
			}));
		}, FORM_CHANGE_DEBOUNCE_MS);
	};

	const handleReset = () => {
		cancelPendingChange();
		for (const hooks of fieldsRef.current.values()) {
			hooks.reset();
		}
		setStatus("idle");
	};

	const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		// A request is already in flight — block re-entry to avoid double
		// fetches. The user is shown `Form.Sending` (or the regular content
		// as a fallback) until the original promise resolves.
		if (status === "sending") return;
		const form = event.currentTarget;

		let allValid = true;
		for (const hooks of fieldsRef.current.values()) {
			if (!hooks.validate()) {
				allValid = false;
			}
		}
		if (!allValid) return;

		// Any debounced change waiting to fire is now obsolete — the submit
		// outcome (`success`/`fail`) carries the final state.
		cancelPendingChange();
		setStatus("sending");

		try {
			const formData = new FormData(form);
			const { url, init } = buildFetchRequest(target, method, formData);
			const response = await fetch(url, init);

			if (!response.ok) {
				throw new Error(`HTTP ${response.status} ${response.statusText}`);
			}

			setStatus("success");
			if (onSuccess) {
				send(`${prefix}:success` as NubeSDKRuntimeEvent, () => ({
					ui: {
						values: {
							[__internalId]: String(response.status),
						},
					},
				}));
			}
		} catch (error) {
			// Always surface the failure in the console — `onFail` is optional
			// and we don't want submit failures to look like dead code when a
			// dev forgets to register the handler.
			console.error(
				`[nube-sdk] Form submit failed (${method} ${target}):`,
				error,
			);
			setStatus("failure");
			if (onFail) {
				// Don't forward the raw error.message to the worker — it can
				// leak internal details. A short, generic label keeps the
				// worker boundary safe; the rich object is in the console
				// above for anyone debugging.
				send(`${prefix}:fail` as NubeSDKRuntimeEvent, () => ({
					ui: {
						values: {
							[__internalId]: "Submit failed",
						},
					},
				}));
			}
		}
	};

	const { regular, conditionals } = useMemo(
		() => partitionChildren(children),
		[children],
	);

	const renderedChildren = useMemo(() => {
		if (status === "idle") return regular;
		const matchingType = CONDITIONAL_TYPE_BY_STATUS[status];
		const conditional = conditionals.get(matchingType);
		// Graceful fallback: if the consumer hasn't declared a matching
		// conditional block, keep the regular content visible.
		return conditional ? [conditional] : regular;
	}, [status, regular, conditionals]);

	return (
		<FormContext.Provider value={contextValue}>
			<form
				className="nube-form"
				id={__internalId}
				data-component-id={id}
				data-form-status={status}
				method={method}
				action={target}
				onChange={handleChange}
				onReset={handleReset}
				onSubmit={handleSubmit}
				noValidate
				style={style}
			>
				{renderedChildren}
			</form>
		</FormContext.Provider>
	);
}
