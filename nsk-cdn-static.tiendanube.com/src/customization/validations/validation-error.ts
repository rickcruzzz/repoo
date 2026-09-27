import type { CustomizationTarget } from "@tiendanube/nube-sdk-internal-types";

/**
 * Raised when a catalog entry's `validate` rule rejects the options an app
 * sent, e.g. an empty label or a font colour that would make the text
 * unreadable.
 *
 * The controller logs it as a `console.warn` rather than letting it out. The
 * class exists so a refusal carries the target and the rule's own `reason`
 * instead of a bare string — that reason is also what reaches the app in
 * `CustomizationResult.reason`.
 *
 * @see ./README.md
 */
export class CustomizationValidationError extends Error {
	constructor(
		public readonly target: CustomizationTarget,
		public readonly appId: string,
		public readonly reason: string,
	) {
		super(
			`Customization: app "${appId}" sent options rejected by the validation rule for target "${target}": ${reason}`,
		);
		this.name = "CustomizationValidationError";
	}
}
