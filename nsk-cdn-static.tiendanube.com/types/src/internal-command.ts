import type { AppID } from "./state";

export const INTERNAL_COMMAND_REQUEST_TYPE = "internal:command:request";
export const INTERNAL_COMMAND_RESPONSE_TYPE = "internal:command:response";

export const INTERNAL_COMMAND_ERROR_CODES = {
	UNKNOWN: "unknown_command",
	FAILED: "command_failed",
	TIMEOUT: "timeout",
} as const;

export type InternalCommandErrorCode =
	(typeof INTERNAL_COMMAND_ERROR_CODES)[keyof typeof INTERNAL_COMMAND_ERROR_CODES];

export type InternalCommandError = {
	code: InternalCommandErrorCode;
	message: string;
};

export type InternalCommandRequest<Params = unknown> = {
	type: typeof INTERNAL_COMMAND_REQUEST_TYPE;
	scope: string;
	command: string;
	trace_id: string;
	params?: Params;
	// `app_id` is intentionally absent from the request wire shape. The
	// worker is never the source of truth for its own identity; the
	// register on the main thread injects `app_id` from the worker's
	// closure before invoking the handler (see `InternalCommandHandlerArgs`
	// and the `InternalCommandResponse` below, which both carry it).
};

export type InternalCommandSuccessResponse<Result = unknown> = {
	type: typeof INTERNAL_COMMAND_RESPONSE_TYPE;
	scope: string;
	command: string;
	app_id: AppID;
	trace_id: string;
	status: "success";
	result: Result;
};

export type InternalCommandErrorResponse = {
	type: typeof INTERNAL_COMMAND_RESPONSE_TYPE;
	scope: string;
	command: string;
	app_id: AppID;
	trace_id: string;
	status: "error";
	error: InternalCommandError;
};

export type InternalCommandResponse<Result = unknown> =
	| InternalCommandSuccessResponse<Result>
	| InternalCommandErrorResponse;

export type InternalCommandHandlerArgs<Params = unknown> = {
	params?: Params;
	app_id: AppID;
};

export type InternalCommandHandler<Params = unknown, Result = unknown> = (
	args: InternalCommandHandlerArgs<Params>,
) => Result | Promise<Result>;

export type InternalCommandRegistrationOptions = {
	timeout?: number;
};

export type NubeSDKCommand = {
	add: <Params = unknown, Result = unknown>(
		scope: string,
		command: string,
		handler: InternalCommandHandler<Params, Result>,
		options?: InternalCommandRegistrationOptions,
	) => () => void;
};

/* type guards */

function isObject(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

function hasStringProps(
	value: Record<string, unknown>,
	keys: readonly string[],
): boolean {
	for (const key of keys) {
		if (typeof value[key] !== "string") return false;
	}
	return true;
}

// Request wire shape has no `app_id` (see `InternalCommandRequest`); the
// response always carries one because the dispatcher injects it from the
// worker's closure as it builds the reply.
const REQUEST_REQUIRED_KEYS = ["scope", "command", "trace_id"] as const;
const RESPONSE_REQUIRED_KEYS = [
	"scope",
	"command",
	"app_id",
	"trace_id",
] as const;

export function isInternalCommandRequest(
	value: unknown,
): value is InternalCommandRequest {
	if (!isObject(value)) return false;
	if (value.type !== INTERNAL_COMMAND_REQUEST_TYPE) return false;
	return hasStringProps(value, REQUEST_REQUIRED_KEYS);
}

export function isInternalCommandResponse(
	value: unknown,
): value is InternalCommandResponse {
	if (!isObject(value)) return false;
	if (value.type !== INTERNAL_COMMAND_RESPONSE_TYPE) return false;
	if (!hasStringProps(value, RESPONSE_REQUIRED_KEYS)) return false;
	if (value.status === "success") {
		// `result` is `Result` (default `unknown`); any value — including the
		// absent-when-undefined case JSON.stringify produces — is acceptable.
		return true;
	}
	if (value.status === "error") {
		const err = value.error;
		return (
			isObject(err) &&
			typeof err.code === "string" &&
			typeof err.message === "string"
		);
	}
	return false;
}
