import { useContext } from "react";
import { type AllIconNames, Icon } from "../Icon";
import { ClipboardContext } from "./clipboard-context";

type ClipboardIndicatorProps = {
	id?: string;
	__internalId?: string;
	/** Icon shown in the idle state. Defaults to `"copy"`. */
	copyIcon?: AllIconNames;
	/** Icon shown right after copying. Defaults to `"check"`. */
	copiedIcon?: AllIconNames;
};

/**
 * `Clipboard.Indicator` renders an icon that reflects the copied state of the
 * surrounding `Clipboard.Root`: `copyIcon` by default, switching to
 * `copiedIcon` right after a successful copy.
 *
 * Exposes a `data-clipboard-state` attribute (`"idle"` / `"copied"`) on its
 * wrapper so the icon can be styled per state via CSS, e.g.
 * `[data-clipboard-state="copied"] { ... }`.
 */
export function ClipboardIndicator({
	copyIcon = "copy",
	copiedIcon = "check",
}: Readonly<ClipboardIndicatorProps>) {
	const context = useContext(ClipboardContext);
	const copied = context?.copied ?? false;

	return (
		<span
			className="nube-clipboard-indicator"
			data-clipboard-state={copied ? "copied" : "idle"}
			style={{ display: "inline-flex" }}
		>
			<Icon name={copied ? copiedIcon : copyIcon} size={16} />
		</span>
	);
}
