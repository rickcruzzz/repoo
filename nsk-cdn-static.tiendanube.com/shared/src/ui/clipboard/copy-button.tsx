import { ClipboardIndicator } from "./clipboard-indicator";
import { ClipboardRoot } from "./clipboard-root";
import { ClipboardTrigger } from "./clipboard-trigger";

type CopyButtonProps = {
	id?: string;
	__internalId: string;
	/** The text written to the clipboard on click. */
	value: string;
	ariaLabel?: string;
};

/**
 * Internal icon-only copy button built on top of the `Clipboard` compound.
 *
 * Used by components that expose the `showCopyButton` prop (Field, TextArea,
 * Text). It is intentionally not part of the public API — the compound stays
 * internal for now.
 */
export function CopyButton({
	id,
	__internalId,
	value,
	ariaLabel,
}: Readonly<CopyButtonProps>) {
	const componentId = id ?? __internalId;
	return (
		<ClipboardRoot
			id={componentId}
			__internalId={`${__internalId}-clipboard`}
			value={value}
		>
			<ClipboardTrigger
				id={componentId}
				__internalId={`${__internalId}-clipboard-trigger`}
				variant="transparent"
				ariaLabel={ariaLabel}
				style={{
					background: "transparent",
					border: "none",
					padding: "4px",
					minWidth: 0,
					color: "inherit",
					cursor: "pointer",
					lineHeight: 0,
				}}
			>
				<ClipboardIndicator />
			</ClipboardTrigger>
		</ClipboardRoot>
	);
}
