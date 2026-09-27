import { createContext } from "react";

export type ClipboardContextValue = {
	/** Whether the value was just copied (drives the indicator + aria-live). */
	copied: boolean;
	/** Copies the value held by `Clipboard.Root` to the clipboard. */
	copy: () => void;
	/** Localized default label for the trigger (used as aria-label fallback). */
	copyLabel: string;
	/** Localized label announced after a successful copy. */
	copiedLabel: string;
};

export const ClipboardContext = createContext<ClipboardContextValue | null>(
	null,
);
