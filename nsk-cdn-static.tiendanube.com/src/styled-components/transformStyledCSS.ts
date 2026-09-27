import { isUnsafeCSSAllowed } from "./allowUnsafeCSS";

const MEDIA_QUERY_REGEX = /\s*{\s*/;
const PSEUDO_REGEX = /&(:{1,2}\w+)\s*{(.*)}/s;
const SELECTOR_CONTENT_REGEX = /([^{]+)\s*{([\s\S]*)}/;

const UNSUPPORTED_SELECTORS = [
	// Global selectors matched as selector tokens: a leading selector boundary
	// (start / whitespace / combinator / comma / brace — but NOT "(") plus a
	// trailing selector continuation. This rejects `body:has(&)` and `html.dark`
	// while keeping values like `url(html-logo.svg)` and `content: "the body"`
	// valid. Precise tokenization (decoding CSS escapes, parsing preludes) is
	// deferred to the allow-list rework tracked in ext-1239.
	{ pattern: /:root\b/i, name: ":root" },
	{ pattern: /(^|[\s,>~+{}])html(?=[\s.:#\[>~+{,]|$)/i, name: "html" },
	{ pattern: /(^|[\s,>~+{}])body(?=[\s.:#\[>~+{,]|$)/i, name: "body" },
	{ pattern: /(^|[\s,>~+{}])\*\s*{/, name: "*" },
	// Tree-climbing / sibling escapes. Only `&` INSIDE `:has(...)` climbs to
	// ancestors (`body:has(&)`), so downward `:has()` such as `.card:has(img)`
	// or `&:has(.icon)` stays allowed. `& ~`/`& +` reach the component's
	// siblings (host elements), which always leaks. Deeply nested `:has()`
	// arguments (e.g. `:has(:is(&))`)
	{ pattern: /:has\([^)]*&/i, name: ":has(&) (ancestor climb)" },
	{ pattern: /&\s*[~+]/, name: "& sibling combinator (~, +)" },
	{ pattern: /@import\s+/, name: "@import" },
	{ pattern: /@namespace\s+/, name: "@namespace" },
	{ pattern: /expression\s*\(/, name: "expression()" },
	{ pattern: /:\s*data:/i, name: "data:" },
	{ pattern: /:\s*javascript:/i, name: "javascript:" },
] as const;

type TransformStyledCSSParams = {
	componentId: string;
	slot: string;
	styled: string;
};

type ParsedCSSData = {
	baseSelector: string;
	baseRules: string[];
	classBlocks: Map<string, string[]>;
	pseudoMap: Map<string, string[]>;
	mediaMap: Map<string, string[]>;
	keyframesOutput: string[];
};

type ParsedCSSDataWithoutSelector = Omit<ParsedCSSData, "baseSelector">;

function isMediaQueryBlock(block: string): boolean {
	return block.startsWith("@media");
}

function isKeyframesBlock(block: string): boolean {
	return block.startsWith("@keyframes");
}

function isPseudoBlock(block: string): boolean {
	return block.startsWith("&:");
}

function validateUnsupportedSelectors(styled: string): void {
	// The `-allow-unsafe-css*` bundles opt out of the allow-list entirely.
	if (isUnsafeCSSAllowed()) return;

	for (const { pattern, name } of UNSUPPORTED_SELECTORS) {
		if (pattern.test(styled)) {
			throw new Error(`Selector "${name}" is not supported.`);
		}
	}
}

function processMediaQueryBlock(
	block: string,
	mediaMap: Map<string, string[]>,
): void {
	const parts = block.split(MEDIA_QUERY_REGEX);
	const query = parts[0];
	const body = parts[1];
	if (query && body) {
		const content = body.slice(0, -1);
		const list = mediaMap.get(query.trim()) ?? [];
		list.push(...extractDeclarations(content));
		mediaMap.set(query.trim(), list);
	}
}

function processPseudoBlock(
	block: string,
	pseudoMap: Map<string, string[]>,
): void {
	const match = block.match(PSEUDO_REGEX);
	if (match) {
		const pseudo = match[1];
		const content = match[2];
		if (pseudo && content !== undefined) {
			const list = pseudoMap.get(pseudo) ?? [];
			list.push(...extractDeclarations(content));
			pseudoMap.set(pseudo, list);
		}
	}
}

function processNestedSelectorBlock(
	block: string,
	classBlocks: Map<string, string[]>,
): void {
	const match = block.match(SELECTOR_CONTENT_REGEX);
	if (match && typeof match[1] === "string" && typeof match[2] === "string") {
		const selector = match[1].trim();
		const content = match[2].trim();
		const arr = classBlocks.get(selector) ?? [];
		arr.push(content);
		classBlocks.set(selector, arr);
	}
}

function processCSSBlock(
	block: string,
	classBlocks: Map<string, string[]>,
	pseudoMap: Map<string, string[]>,
	mediaMap: Map<string, string[]>,
	keyframesOutput: string[],
): void {
	if (isKeyframesBlock(block)) {
		keyframesOutput.push(block);
	} else if (isMediaQueryBlock(block)) {
		processMediaQueryBlock(block, mediaMap);
	} else if (isPseudoBlock(block)) {
		processPseudoBlock(block, pseudoMap);
	} else {
		processNestedSelectorBlock(block, classBlocks);
	}
}

function parseCSSBlocks(styled: string): ParsedCSSDataWithoutSelector {
	const classBlocks = new Map<string, string[]>();
	const baseRules: string[] = [];
	const pseudoMap = new Map<string, string[]>();
	const mediaMap = new Map<string, string[]>();
	const keyframesOutput: string[] = [];

	let i = 0;
	const len = styled.length;
	let buffer = "";
	let mode: "base" | "block" = "base";
	let stack = 0;

	while (i < len) {
		const char = styled[i];
		buffer += char;

		if (char === "{") {
			stack++;
			mode = "block";
		}

		if (char === "}") {
			stack--;
			if (stack === 0) {
				const block = buffer.trim();
				buffer = "";
				mode = "base";
				processCSSBlock(
					block,
					classBlocks,
					pseudoMap,
					mediaMap,
					keyframesOutput,
				);
			}
		}

		if (mode === "base" && stack === 0 && char === ";") {
			const rule = buffer.trim();
			if (rule) {
				baseRules.push(rule);
			}
			buffer = "";
		}

		i++;
	}

	if (buffer.trim() && mode === "base") {
		baseRules.push(buffer.trim());
	}

	return {
		baseRules,
		classBlocks,
		pseudoMap,
		mediaMap,
		keyframesOutput,
	};
}

function generateBaseContent(
	baseRules: string[],
	classBlocks: Map<string, string[]>,
): string {
	let content = baseRules.join("");
	for (const [className, rulesArr] of classBlocks) {
		content += ` ${className} { ${rulesArr.join(" ")} }`;
	}
	return content.trim();
}

function generatePseudoClasses(
	baseSelector: string,
	pseudoMap: Map<string, string[]>,
): string[] {
	return Array.from(pseudoMap.entries()).map(
		([pseudo, rules]) => `${baseSelector}${pseudo} { ${rules.join(" ")} }`,
	);
}

function generateMediaQueries(
	baseSelector: string,
	mediaMap: Map<string, string[]>,
): string[] {
	return Array.from(mediaMap.entries()).map(
		([query, rules]) =>
			`${query.trim()} { ${baseSelector} { ${rules.join(" ")} } }`,
	);
}

function generateScopedCSS({
	baseSelector,
	baseRules,
	classBlocks,
	pseudoMap,
	mediaMap,
	keyframesOutput,
}: ParsedCSSData): string {
	const output: string[] = [];

	output.push(...keyframesOutput);

	const baseContent = generateBaseContent(baseRules, classBlocks);
	if (baseContent) {
		output.push(`${baseSelector} { ${baseContent} }`);
	}

	output.push(...generatePseudoClasses(baseSelector, pseudoMap));
	output.push(...generateMediaQueries(baseSelector, mediaMap));

	return output.join(" ");
}

function escapeNumericCSSIds(input: string): string {
	return input.replace(/#(\d[\w-]*)/g, (_, id) => {
		const firstDigit = id.charAt(0);
		const rest = id.slice(1);
		return `#\\3${firstDigit} ${rest}`;
	});
}

export function transformStyledCSS({
	componentId,
	slot,
	styled,
}: TransformStyledCSSParams): string {
	validateUnsupportedSelectors(styled);

	const escapedComponentId = escapeNumericCSSIds(`#${componentId}`);
	const baseSelector = `#nube-sdk-slot-${slot} ${escapedComponentId}`;
	const parsedData = parseCSSBlocks(styled);

	return generateScopedCSS({ ...parsedData, baseSelector });
}

function extractDeclarations(css: string): string[] {
	return css
		.split(";")
		.map((r) => r.trim())
		.filter(Boolean)
		.map((r) => (r.endsWith(";") ? r : `${r};`));
}
