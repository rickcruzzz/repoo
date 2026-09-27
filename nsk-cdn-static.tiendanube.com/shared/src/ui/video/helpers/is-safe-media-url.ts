export type HttpUrl = `http://${string}` | `https://${string}`;

/**
 * `src`/`poster` come from partner app code (untrusted input). Require an
 * absolute http(s) URL; reject relative URLs and any other scheme
 * (`javascript:`, `data:`, …) to avoid script execution / data-URI abuse
 * (zero-trust input rule).
 */
export function isSafeMediaUrl(url: unknown): url is HttpUrl {
	if (typeof url !== "string" || url.length === 0) return false;
	try {
		const { protocol } = new URL(url);
		return protocol === "https:" || protocol === "http:";
	} catch {
		return false;
	}
}
