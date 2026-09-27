// A YouTube video ID is exactly 11 chars: letters, digits, hyphens, underscores.
const VIDEO_ID_REGEX = /^[\w-]{11}$/;
// Strip a leading `www.` from the hostname before matching.
const LEADING_WWW_REGEX = /^www\./;
// `/embed/VIDEO_ID` or `/v/VIDEO_ID` in the pathname (captures the ID).
const EMBED_PATH_REGEX = /\/(?:embed|v)\/([\w-]{11})/;

/**
 * Extract a YouTube video ID from a URL or a bare 11-character ID.
 * Returns `null` if the input is not a recognisable YouTube reference.
 *
 * Supported formats:
 * - Bare 11-char ID:          `YE7VzlLtp-4`
 * - youtu.be short link:      `https://youtu.be/YE7VzlLtp-4`
 * - youtube.com watch:        `https://www.youtube.com/watch?v=YE7VzlLtp-4`
 * - youtube.com embed:        `https://www.youtube.com/embed/YE7VzlLtp-4`
 * - youtube-nocookie embed:   `https://www.youtube-nocookie.com/embed/YE7VzlLtp-4`
 */
export function getYouTubeId(src: string): string | null {
	if (typeof src !== "string" || src.length === 0) return null;

	// Bare 11-character video ID.
	if (VIDEO_ID_REGEX.test(src)) return src;

	try {
		const u = new URL(src);
		const host = u.hostname.replace(LEADING_WWW_REGEX, "");

		if (host === "youtu.be") {
			const id = u.pathname.slice(1).split("/").at(0) ?? "";
			return VIDEO_ID_REGEX.test(id) ? id : null;
		}

		if (host === "youtube.com" || host === "youtube-nocookie.com") {
			// /watch?v=...
			const v = u.searchParams.get("v");
			if (v && VIDEO_ID_REGEX.test(v)) return v;

			// /embed/VIDEO_ID or /v/VIDEO_ID
			const m = u.pathname.match(EMBED_PATH_REGEX);
			if (m) return m[1] ?? null;
		}
	} catch {
		/* not a URL — fall through */
	}

	return null;
}
