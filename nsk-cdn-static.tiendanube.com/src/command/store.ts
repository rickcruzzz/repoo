import type {
	InternalCommandHandler,
	InternalCommandHandlerArgs,
	InternalCommandRegistrationOptions,
	NubeSDKCommand,
} from "@tiendanube/nube-sdk-internal-types";

export type CommandEntry = {
	handler: InternalCommandHandler<unknown, unknown>;
	timeout?: number;
};

/**
 * Backing store for command handlers. Structurally extends `NubeSDKCommand`
 * (the public namespace) with `get` and `execute` for the worker dispatcher.
 *
 * - `get` is the inspection method (used for branch-before-execute checks).
 * - `execute` is the invocation method: it looks up the handler (retrying
 *   briefly to absorb the late-registration race — see
 *   `UNKNOWN_COMMAND_RETRY_ATTEMPTS`), normalizes sync/async returns and
 *   applies the registered timeout. Errors are surfaced as typed exceptions
 *   (`UnknownCommandError`, `CommandTimeoutError`) so the dispatcher can map
 *   each one to a wire error code.
 *
 * Assigning a `CommandStore` to a `NubeSDKCommand`-typed slot (e.g.
 * `window.nubeSDK.command`) hides `get`/`execute` from app-facing consumers.
 */
export type CommandStore = NubeSDKCommand & {
	get(scope: string, command: string): CommandEntry | undefined;
	execute(
		scope: string,
		command: string,
		args: InternalCommandHandlerArgs,
	): Promise<unknown>;
};

/**
 * Thrown by `execute` when no handler is registered for `scope:command`,
 * even after the late-registration retry window has elapsed. The dispatcher
 * maps this to the `unknown_command` wire error.
 */
export class UnknownCommandError extends Error {
	constructor(
		public readonly scope: string,
		public readonly command: string,
	) {
		super(`Unknown command: ${scope}:${command}`);
		this.name = "UnknownCommandError";
	}
}

/**
 * Thrown by `execute` when the registered timeout elapses before the
 * handler resolves. The dispatcher maps this to the `timeout` wire error.
 */
export class CommandTimeoutError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "CommandTimeoutError";
	}
}

/**
 * Thrown by `add` when `scope` or `command` contains anything other than
 * ASCII letters and digits. The store key is built as `${scope}:${command}`,
 * so any non-alphanumeric character (notably `:`) would make collisions
 * possible — e.g. `add("a:b", "c")` and `add("a", "b:c")` would both resolve
 * to `"a:b:c"`. Restricting the alphabet at registration time makes the key
 * an unambiguous round-trip of the inputs.
 */
export class InvalidCommandKeyError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "InvalidCommandKeyError";
	}
}

const VALID_KEY_PATTERN = /^[A-Za-z0-9]+$/;

function assertValidKeyPart(label: "scope" | "command", value: unknown): void {
	// Explicit string check first — `RegExp.prototype.test` coerces its
	// argument (e.g. `undefined` → `"undefined"`, which would pass the
	// alphanumeric pattern). JS callers bypassing the TS signature must
	// fail here, not slip through coercion.
	if (typeof value !== "string") {
		throw new InvalidCommandKeyError(
			`Invalid ${label}: expected a string, got ${value === null ? "null" : typeof value}.`,
		);
	}
	if (!VALID_KEY_PATTERN.test(value)) {
		throw new InvalidCommandKeyError(
			`Invalid ${label} "${value}": only alphanumeric characters are allowed.`,
		);
	}
}

/**
 * Thrown by `add` when `options.timeout` is present but isn't a finite
 * positive number of milliseconds. Without this guard, values like `0`,
 * `NaN`, `-1` or `Infinity` would silently break the command: `setTimeout`
 * coerces `NaN`/negatives to `0` (instant timeout response on every call),
 * and a non-number bypassing TypeScript would mistype the entry.
 */
export class InvalidCommandTimeoutError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "InvalidCommandTimeoutError";
	}
}

function assertValidTimeout(value: unknown): void {
	if (value === undefined) return;
	if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
		throw new InvalidCommandTimeoutError(
			`Invalid timeout ${String(value)}: must be a finite positive number of milliseconds.`,
		);
	}
}

function buildKey(scope: string, command: string): string {
	return `${scope}:${command}`;
}

// Late-registration retry window: a request can arrive before the app has
// called `add(...)`. Poll across one immediate lookup plus
// UNKNOWN_COMMAND_RETRY_ATTEMPTS re-checks spaced UNKNOWN_COMMAND_RETRY_DELAY_MS
// apart (8 × 250ms = 2000ms max wait) before giving up.
export const UNKNOWN_COMMAND_RETRY_ATTEMPTS = 8;
export const UNKNOWN_COMMAND_RETRY_DELAY_MS = 250;

function delay(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Poll `commands` for `key`, absorbing the late-registration race. Returns the
 * entry as soon as it appears, or `undefined` once the retry window is spent.
 * Only the lookup is retried, the caller invokes the handler exactly once.
 */
export async function resolveEntry(
	commands: Map<string, CommandEntry>,
	key: string,
): Promise<CommandEntry | undefined> {
	let entry = commands.get(key);
	for (
		let attempt = 0;
		entry === undefined && attempt < UNKNOWN_COMMAND_RETRY_ATTEMPTS;
		attempt++
	) {
		await delay(UNKNOWN_COMMAND_RETRY_DELAY_MS);
		entry = commands.get(key);
	}
	return entry;
}

/**
 * Build a command store bound to a backing `Map`.
 *
 * The Map IS the state — pass one explicitly when you need to inspect or
 * pre-seed entries (tests, wiring with the worker dispatcher). Omit it for
 * a fully encapsulated store whose state is unreachable from the outside.
 */
export function createCommandStore(
	commands: Map<string, CommandEntry> = new Map(),
): CommandStore {
	return {
		add<Params = unknown, Result = unknown>(
			scope: string,
			command: string,
			handler: InternalCommandHandler<Params, Result>,
			options?: InternalCommandRegistrationOptions,
		): () => void {
			assertValidKeyPart("scope", scope);
			assertValidKeyPart("command", command);
			const timeout = options?.timeout;
			assertValidTimeout(timeout);
			const key = buildKey(scope, command);
			if (commands.has(key)) {
				console.warn(
					`[nube-sdk] Command "${key}" is being re-added; replacing the previous handler.`,
				);
			}
			const entry: CommandEntry = {
				handler: handler as InternalCommandHandler<unknown, unknown>,
				timeout,
			};
			commands.set(key, entry);
			// Disposer is stable across re-adds: a stale call must not wipe
			// a newer registration that replaced this entry.
			return () => {
				if (commands.get(key) === entry) {
					commands.delete(key);
				}
			};
		},

		get(scope: string, command: string): CommandEntry | undefined {
			return commands.get(buildKey(scope, command));
		},

		async execute(
			scope: string,
			command: string,
			args: InternalCommandHandlerArgs,
		): Promise<unknown> {
			const entry = await resolveEntry(commands, buildKey(scope, command));
			if (!entry) {
				return Promise.reject(new UnknownCommandError(scope, command));
			}

			// `Promise.resolve().then(...)` normalizes both sync returns and
			// sync exceptions into a rejection — so a handler that throws
			// synchronously can't escape past the race below.
			const handlerPromise = Promise.resolve().then(() => entry.handler(args));

			if (entry.timeout === undefined) {
				return handlerPromise;
			}

			const registeredTimeout = entry.timeout;
			let timer: ReturnType<typeof setTimeout> | undefined;
			const timeoutPromise = new Promise<never>((_, reject) => {
				timer = setTimeout(
					() =>
						reject(
							new CommandTimeoutError(
								`Command "${scope}:${command}" timed out after ${registeredTimeout}ms`,
							),
						),
					registeredTimeout,
				);
			});

			return Promise.race([handlerPromise, timeoutPromise]).finally(() => {
				if (timer !== undefined) clearTimeout(timer);
			});
		},
	};
}
