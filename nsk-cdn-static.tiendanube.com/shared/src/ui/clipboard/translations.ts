export type LanguageKey = "pt" | "es" | "en";

export type ClipboardTranslations = {
	/** Default accessible label for the trigger (when `ariaLabel` is not set). */
	copyLabel: string;
	/** Message announced via `aria-live` after a successful copy. */
	copiedLabel: string;
};

const translations: Record<LanguageKey, ClipboardTranslations> = {
	pt: {
		copyLabel: "Copiar",
		copiedLabel: "Copiado",
	},
	es: {
		copyLabel: "Copiar",
		copiedLabel: "Copiado",
	},
	en: {
		copyLabel: "Copy",
		copiedLabel: "Copied",
	},
};

export function getClipboardTranslations(
	language: string | undefined,
): ClipboardTranslations {
	const lang = (language?.toLowerCase() || "pt") as LanguageKey;
	return translations[lang] || translations.pt;
}
