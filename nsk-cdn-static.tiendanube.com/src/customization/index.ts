import type {
	CustomizationInput,
	CustomizationResult,
	CustomizationTarget,
} from "@tiendanube/nube-sdk-internal-types";
import type { CommandStore } from "../command";
import { createCustomizationController } from "./controller";

export * from "./controller";
export * from "./handlers";
// Only the error, not the whole validation toolkit: rules are an internal
// concern of the catalog, but the error type travels with the warnings.
export * from "./validations/validation-error";

/**
 * Scope of the customization commands. Mirrors the literal in
 * `worker/integrations/customization.ts`, the same convention the host-side
 * bridges follow for `Checkout` / `Analytics`.
 */
const SCOPE = "Customization" as const;

/**
 * Register `Customization:set` / `Customization:reset` on the main thread, and
 * return a disposer that unregisters both.
 *
 * `app_id` comes from the dispatcher, taken from the worker's closure and
 * never from the payload, so every warning the controller logs is
 * attributable to an app.
 *
 * @see ./README.md for the flow, the one-shot contract and what the app owns.
 */
export function registerCustomizationCommands(store: CommandStore): () => void {
	const controller = createCustomizationController();

	const disposers = [
		store.add<CustomizationInput, CustomizationResult>(
			SCOPE,
			"set",
			({ params, app_id }) => controller.set(params, app_id),
		),
		store.add<CustomizationTarget[], CustomizationResult>(
			SCOPE,
			"reset",
			({ params, app_id }) => controller.reset(params, app_id),
		),
	];

	return () => {
		for (const dispose of disposers) dispose();
	};
}
