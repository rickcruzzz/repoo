import type {
	AppID,
	CustomizationFailureCode,
	CustomizationResult,
	CustomizationTarget,
} from "@tiendanube/nube-sdk-internal-types";
import { getHandler } from "./handlers";
import { forget, recall, remember } from "./snapshot";
import { CustomizationValidationError } from "./validations";

export type CustomizationController = {
	/**
	 * Apply a `CustomizationInput` to what is on the page right now.
	 * `input` is typed `unknown` on purpose: it comes off the worker wire,
	 * so it is validated here rather than trusted.
	 */
	set(input: unknown, appId: AppID): CustomizationResult;
	/** Restore the pristine value of every element matching `targets`. */
	reset(targets: unknown, appId: AppID): CustomizationResult;
};

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Why a target's options cannot be applied, or `null` when they can.
 *
 * Options come off the worker wire, so the type of each value is not
 * guaranteed, and each problem is worth its own words:
 *
 * - a **non-string** value is malformed input, and rejecting it here keeps it
 *   out of `validate` and `operation`, which would otherwise coerce it into
 *   the DOM or throw on it;
 * - an **empty** object is what the types already forbid (a target's options
 *   are "at least one"), and it must not reach `operation`: with nothing to
 *   apply it walks past `validate`, takes a pristine snapshot and counts as
 *   applied, so the app is told `{ ok: true, applied: 1 }` about a call that
 *   changed nothing.
 */
function optionsRefusal(options: Record<string, unknown>): string | null {
	if (Object.keys(options).length === 0) return "no option was sent";
	if (!Object.values(options).every((option) => typeof option === "string")) {
		return "every option must be a string";
	}
	return null;
}

function warn(message: string): void {
	console.warn(`[nube-sdk] ${message}`);
}

/** A failure, before it is merged into the call's single result. */
type Failure = { code: CustomizationFailureCode; reason: string };

/** What happened to one target: how many elements took it, and why not. */
type TargetOutcome = {
	applied: number;
	refused: number;
	failure?: Failure;
};

/**
 * Report a failure the way this API reports everything: a `console.warn` for
 * whoever is looking at the page, and the code plus reason handed back so they
 * reach the app in the `CustomizationResult`.
 */
function refuse(
	code: CustomizationFailureCode,
	reason: string,
	appId: AppID,
): Failure {
	warn(`Customization: app "${appId}": ${reason}.`);
	return { code, reason };
}

/**
 * Merge what happened to each target into the one result the app gets.
 *
 * With several failing targets the reason lists them all but the code can only
 * be one, so the first failure wins. That is a real limitation of a flat
 * result and the reason a per-target breakdown is the planned shape for bulk
 * calls — see ./README.md. It is unreachable while the catalog has a single
 * target.
 */
function toResult(
	failures: Failure[],
	applied: number,
	refused: number,
): CustomizationResult {
	const [first] = failures;
	if (!first) return { ok: true, applied, refused };
	return {
		ok: false,
		code: first.code,
		reason: failures.map((failure) => failure.reason).join("; "),
	};
}

/**
 * Applies and undoes customizations on the host's DOM. One-shot by design:
 * each call touches the elements that exist at that moment and nothing here
 * watches the DOM afterwards.
 *
 * @see ./README.md
 */
export function createCustomizationController(): CustomizationController {
	/** A target nothing could be done to, with the reason already warned. */
	function failed(
		code: CustomizationFailureCode,
		reason: string,
		appId: AppID,
	): TargetOutcome {
		return { applied: 0, refused: 0, failure: refuse(code, reason, appId) };
	}

	function applyTarget(
		target: string,
		options: unknown,
		appId: AppID,
	): TargetOutcome {
		const handler = getHandler(target);
		if (!handler) {
			return failed("unknown_target", `unknown target "${target}"`, appId);
		}

		if (!isRecord(options)) {
			return failed(
				"invalid_input",
				`invalid options for target "${target}": options must be an object`,
				appId,
			);
		}

		const optionsProblem = optionsRefusal(options);
		if (optionsProblem) {
			return failed(
				"invalid_input",
				`invalid options for target "${target}": ${optionsProblem}`,
				appId,
			);
		}

		const elements = document.querySelectorAll(handler.selector);
		if (elements.length === 0) {
			return failed(
				"not_found",
				`target "${target}" matched no element on this page; call "set" again once it exists`,
				appId,
			);
		}

		let applied = 0;
		let refusedElements = 0;
		// Distinct reasons, so N elements refused for the same reason report it
		// once.
		const refusals = new Set<string>();

		for (const element of elements) {
			// Before `remember` on purpose, so a refused customization leaves
			// no snapshot behind. Per element, because a rule may depend on
			// where the element sits.
			const refusal = handler.validate?.(element, options) ?? null;
			if (refusal) {
				refusedElements++;
				warn(
					new CustomizationValidationError(
						target as CustomizationTarget,
						appId,
						refusal,
					).message,
				);
				refusals.add(refusal);
				continue;
			}

			// Pristine value first, and only the first time: it is what
			// `reset` restores, so it must survive repeated `set`s.
			remember(element, target as CustomizationTarget, handler.read(element));
			handler.operation(element, options);
			applied++;
		}

		// One applied element is a customization a shopper can see, so the
		// call succeeds even when a twin was refused — `.js-addtocart` also
		// matches the theme's hidden placeholder, and failing the whole call
		// over an invisible element would train apps to ignore the result.
		// The counts still report it, and each refusal was warned about
		// individually above.
		if (applied > 0) return { applied, refused: refusedElements };

		return {
			applied: 0,
			refused: elements.length,
			// Already warned per element, so this one is not re-reported.
			failure: {
				code: "refused",
				reason: `target "${target}" was refused on every matching element: ${[
					...refusals,
				].join(" / ")}`,
			},
		};
	}

	return {
		set(input, appId) {
			if (!isRecord(input)) {
				return {
					ok: false,
					...refuse(
						"invalid_input",
						'"set" was called without a valid target object',
						appId,
					),
				};
			}

			const entries = Object.entries(input);
			if (entries.length === 0) {
				// Same lie as an empty options object: nothing was asked for, so
				// reporting success would be reporting a change that never
				// happened. `reset([])` is deliberately NOT symmetrical — an
				// empty list is a typed, legitimate "nothing to restore", which
				// an app can arrive at by computing the list.
				return {
					ok: false,
					...refuse(
						"invalid_input",
						'"set" was called without a target',
						appId,
					),
				};
			}

			const failures: Failure[] = [];
			let applied = 0;
			let refused = 0;

			for (const [target, options] of entries) {
				const outcome = applyTarget(target, options, appId);
				applied += outcome.applied;
				refused += outcome.refused;
				if (outcome.failure) failures.push(outcome.failure);
			}

			return toResult(failures, applied, refused);
		},

		reset(targets, appId) {
			if (!Array.isArray(targets)) {
				return {
					ok: false,
					...refuse(
						"invalid_input",
						'"reset" was called without a list of targets',
						appId,
					),
				};
			}

			const failures: Failure[] = [];
			let restored = 0;

			for (const target of targets) {
				if (typeof target !== "string") {
					failures.push(
						refuse(
							"invalid_input",
							'"reset" was called with a non-string target',
							appId,
						),
					);
					continue;
				}

				const handler = getHandler(target);
				if (!handler) {
					failures.push(
						refuse("unknown_target", `unknown target "${target}"`, appId),
					);
					continue;
				}

				// A target with nothing to restore is a no-op, not a failure:
				// the element may have been replaced, or never customized.
				for (const element of document.querySelectorAll(handler.selector)) {
					const pristine = recall(element, target as CustomizationTarget);
					if (!pristine) continue;
					handler.operation(element, pristine);
					forget(element, target as CustomizationTarget);
					restored++;
				}
			}

			// Nothing here validates, so an element is never refused on reset.
			return toResult(failures, restored, 0);
		},
	};
}
