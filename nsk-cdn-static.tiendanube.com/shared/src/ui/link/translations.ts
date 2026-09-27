export type LanguageKey = "pt" | "es" | "en";

export type LinkModalTranslations = {
	title: string;
	description: string;
	stayButton: string;
	continueButton: string;
	closeButton: string;
};

const translations: Record<LanguageKey, LinkModalTranslations> = {
	pt: {
		title: "Você vai sair da {store_name}",
		description:
			"O site para onde você está indo não faz parte da nossa loja. Ao continuar, será feito o redirecionamento para:",
		stayButton: "Permanecer na loja",
		continueButton: "Continuar",
		closeButton: "Fechar",
	},
	es: {
		title: "Vas a salir de {store_name}",
		description:
			"El sitio al que estás por ir no forma parte de nuestra tienda. Al continuar, te dirigirás a:",
		stayButton: "Permanecer en la tienda",
		continueButton: "Continuar",
		closeButton: "Cerrar",
	},
	en: {
		title: "You're about to leave {store_name}",
		description:
			"The site you're visiting is not part of our store. If you continue, you'll be redirected to:",
		stayButton: "Stay on this site",
		continueButton: "Continue",
		closeButton: "Close",
	},
};

export function getLinkModalTranslations(
	language: string | undefined,
): LinkModalTranslations {
	const lang = (language?.toLowerCase() || "pt") as LanguageKey;
	return translations[lang] || translations.pt;
}

export function translateText(
	text: string,
	replacements: Record<string, string>,
): string {
	return Object.entries(replacements).reduce(
		(acc, [key, value]) => acc.replace(`{${key}}`, value),
		text,
	);
}
