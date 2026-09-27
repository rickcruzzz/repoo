/**
 * Pure colour math behind the "don't let an app hide the text" rule.
 *
 * `parseColor` doubles as the allow-list of accepted notations: hex, `rgb()`,
 * `rgba()`, `hsl()` and `hsla()`.
 *
 * The set is deliberately small so the contrast check can always be
 * *performed*, which is the only way it is worth anything: only a colour the
 * SDK can read is a colour it can weigh against the background. Anything
 * else, including named colours and values whose meaning depends on context
 * (`var(--x)`, `currentColor`), would have to be trusted blindly, and that is
 * exactly the hole the rule exists to close. The notation is refused for that
 * reason, not for lack of effort.
 *
 * @see ./README.md
 */

export type Rgb = {
	r: number;
	g: number;
	b: number;
	/** 0-1. Absent alpha parses as fully opaque. */
	a: number;
};

const HEX_SHORT = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/i;
const HEX_LONG = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i;
const RGB_FUNCTIONAL = /^rgba?\(([^)]+)\)$/i;
const HSL_FUNCTIONAL = /^hsla?\(([^)]+)\)$/i;

/**
 * Minimum contrast ratio a font colour must reach against its background.
 * WCAG's bar for large text and non-text UI, deliberately not the 4.5:1 of AA
 * body text.
 *
 * @see ./README.md
 */
export const MIN_CONTRAST_RATIO = 3;

function clampChannel(value: number): number {
	return Math.min(255, Math.max(0, value));
}

/**
 * Split the inside of a functional notation into its arguments, accepting both
 * the legacy comma form and the space-separated one (`rgb(255 0 0 / 50%)`),
 * since which one a browser reports back varies.
 */
function splitArguments(body: string): string[] {
	return body
		.split(/[\s,/]+/)
		.map((part) => part.trim())
		.filter(Boolean);
}

/** Parse the optional trailing alpha, as a number or a percentage. */
function parseAlpha(raw: string | undefined): number | null {
	if (raw === undefined) return 1;
	const alpha = raw.endsWith("%")
		? Number.parseFloat(raw) / 100
		: Number.parseFloat(raw);
	if (!Number.isFinite(alpha)) return null;
	return Math.min(1, Math.max(0, alpha));
}

function parseHex(value: string): Rgb | null {
	const short = value.match(HEX_SHORT);
	if (short?.[1] && short[2] && short[3]) {
		return {
			// `#abc` means `#aabbcc`, so each digit doubles.
			r: Number.parseInt(short[1].repeat(2), 16),
			g: Number.parseInt(short[2].repeat(2), 16),
			b: Number.parseInt(short[3].repeat(2), 16),
			a: 1,
		};
	}

	const long = value.match(HEX_LONG);
	if (long?.[1] && long[2] && long[3]) {
		return {
			r: Number.parseInt(long[1], 16),
			g: Number.parseInt(long[2], 16),
			b: Number.parseInt(long[3], 16),
			a: 1,
		};
	}

	return null;
}

function parseRgbFunctional(value: string): Rgb | null {
	const match = value.match(RGB_FUNCTIONAL);
	if (!match?.[1]) return null;

	const parts = splitArguments(match[1]);
	if (parts.length < 3) return null;

	const channels = parts
		.slice(0, 3)
		.map((part) =>
			part.endsWith("%")
				? (Number.parseFloat(part) / 100) * 255
				: Number.parseFloat(part),
		);
	if (channels.some((channel) => !Number.isFinite(channel))) return null;

	const alpha = parseAlpha(parts[3]);
	if (alpha === null) return null;

	const [r, g, b] = channels as [number, number, number];
	return {
		r: clampChannel(r),
		g: clampChannel(g),
		b: clampChannel(b),
		a: alpha,
	};
}

/**
 * Hue is accepted as a bare number or in `deg`. The other angle units
 * (`turn`, `rad`, `grad`) are legal CSS but rare enough that supporting them
 * would only widen the surface the rule has to reason about.
 */
function parseHue(raw: string): number | null {
	const normalized = raw.toLowerCase();
	const value = normalized.endsWith("deg")
		? Number.parseFloat(normalized.slice(0, -3))
		: Number.parseFloat(normalized);
	if (!Number.isFinite(value)) return null;
	if (/[a-z]/.test(normalized.replace(/deg$/, ""))) return null;
	// Wrap into [0, 360), so `-90` and `450` behave as CSS says.
	return ((value % 360) + 360) % 360;
}

function parseHslFunctional(value: string): Rgb | null {
	const match = value.match(HSL_FUNCTIONAL);
	if (!match?.[1]) return null;

	const parts = splitArguments(match[1]);
	if (parts.length < 3) return null;

	const hue = parseHue(parts[0] as string);
	const saturation = Number.parseFloat(parts[1] as string) / 100;
	const lightness = Number.parseFloat(parts[2] as string) / 100;
	if (
		hue === null ||
		!Number.isFinite(saturation) ||
		!Number.isFinite(lightness)
	) {
		return null;
	}

	const alpha = parseAlpha(parts[3]);
	if (alpha === null) return null;

	return {
		...hslToRgb(hue, clampUnit(saturation), clampUnit(lightness)),
		a: alpha,
	};
}

function clampUnit(value: number): number {
	return Math.min(1, Math.max(0, value));
}

/** HSL to RGB per the CSS Color specification. */
function hslToRgb(
	hue: number,
	saturation: number,
	lightness: number,
): Omit<Rgb, "a"> {
	const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
	const sector = hue / 60;
	const second = chroma * (1 - Math.abs((sector % 2) - 1));
	const match = lightness - chroma / 2;

	const [r, g, b] =
		sector < 1
			? [chroma, second, 0]
			: sector < 2
				? [second, chroma, 0]
				: sector < 3
					? [0, chroma, second]
					: sector < 4
						? [0, second, chroma]
						: sector < 5
							? [second, 0, chroma]
							: [chroma, 0, second];

	return {
		r: clampChannel((r + match) * 255),
		g: clampChannel((g + match) * 255),
		b: clampChannel((b + match) * 255),
	};
}

/**
 * Parse one of the accepted notations into channels: `#rgb`, `#rrggbb`,
 * `rgb()`, `rgba()`, `hsl()` and `hsla()`.
 *
 * Returns `null` for everything else, which is what makes the contrast rule
 * safe rather than merely present: a colour this cannot read cannot be
 * checked against a background, so it is refused instead of trusted.
 */
export function parseColor(input: string): Rgb | null {
	const value = input.trim();
	return (
		parseHex(value) ?? parseRgbFunctional(value) ?? parseHslFunctional(value)
	);
}

/**
 * Relative luminance per the WCAG 2.1 definition. Alpha is ignored, so
 * flatten with `compositeOver` first when it matters.
 */
export function relativeLuminance({ r, g, b }: Rgb): number {
	const linear = [r, g, b].map((channel) => {
		const ratio = channel / 255;
		return ratio <= 0.03928 ? ratio / 12.92 : ((ratio + 0.055) / 1.055) ** 2.4;
	}) as [number, number, number];

	return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

/** Flatten a translucent colour onto an opaque one. */
export function compositeOver(foreground: Rgb, background: Rgb): Rgb {
	const alpha = foreground.a;
	return {
		r: foreground.r * alpha + background.r * (1 - alpha),
		g: foreground.g * alpha + background.g * (1 - alpha),
		b: foreground.b * alpha + background.b * (1 - alpha),
		a: 1,
	};
}

/**
 * WCAG contrast ratio between two opaque colours: 1 for identical colours,
 * 21 for black on white.
 */
export function contrastRatio(a: Rgb, b: Rgb): number {
	const first = relativeLuminance(a);
	const second = relativeLuminance(b);
	const lighter = Math.max(first, second);
	const darker = Math.min(first, second);
	return (lighter + 0.05) / (darker + 0.05);
}

/**
 * `null` when `foreground` is *provably* readable on `background`; otherwise
 * the reason it is not, phrased for an app to read.
 *
 * Fails closed, so the guarantee is "checked and safe" rather than "not known
 * to be unsafe": a colour either side cannot parse is refused. Options arrive
 * from apps, and a value the SDK cannot evaluate would otherwise walk
 * straight past the rule it exists to satisfy. `var(--x, #ffffff)` reads as a
 * valid declaration to the CSSOM, defeats any parser, and is then resolved to
 * white by the browser.
 *
 * A translucent foreground is flattened onto the background first, so
 * `rgba(0, 0, 0, 0)` collapses to the background itself and scores 1:1.
 *
 * It returns the reason rather than a boolean because that reason is what the
 * app receives in `CustomizationResult.reason`: "refused" without a number to
 * look at is what makes a refusal expensive to debug.
 */
export function contrastRefusal(
	foreground: string,
	background: string,
	minRatio: number = MIN_CONTRAST_RATIO,
): string | null {
	const parsedForeground = parseColor(foreground);
	if (!parsedForeground) {
		return `"${foreground}" uses a notation the contrast check cannot read; use hex, rgb(), rgba(), hsl() or hsla()`;
	}

	const parsedBackground = parseColor(background);
	if (!parsedBackground) {
		return `the background it would sit on ("${background}") could not be read, so the contrast of "${foreground}" cannot be checked`;
	}

	const flattened = compositeOver(parsedForeground, parsedBackground);
	const ratio = contrastRatio(flattened, parsedBackground);
	if (ratio < minRatio) {
		return `"${foreground}" only reaches ${ratio.toFixed(2)}:1 against ${background}; the minimum is ${minRatio}:1`;
	}

	return null;
}
