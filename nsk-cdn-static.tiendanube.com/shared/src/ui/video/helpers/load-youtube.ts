/// <reference types="youtube" />
"use client";

declare global {
	interface Window {
		YT?: typeof YT;
		onYouTubeIframeAPIReady?: () => void;
	}
}

const YT_API_SRC = "https://www.youtube.com/iframe_api";
const TIMEOUT_MS = 15_000;

let ytApiPromise: Promise<typeof YT> | null = null;

/** Load the YouTube IFrame API once */
export function loadYouTubeIframeApi(): Promise<typeof YT> {
	if (typeof window === "undefined" || typeof document === "undefined") {
		return Promise.reject(new Error("YouTube IFrame API requires a DOM"));
	}
	if (window.YT?.Player) return Promise.resolve(window.YT as typeof YT);
	if (ytApiPromise) return ytApiPromise;

	ytApiPromise = new Promise<typeof YT>((resolve, reject) => {
		const timer = setTimeout(() => {
			ytApiPromise = null;
			reject(new Error("YouTube IFrame API load timed out"));
		}, TIMEOUT_MS);

		// Chain with any pre-existing ready handler (e.g. another library).
		const prev = window.onYouTubeIframeAPIReady;
		window.onYouTubeIframeAPIReady = () => {
			clearTimeout(timer);
			prev?.();
			if (window.YT) {
				resolve(window.YT as typeof YT);
			} else {
				ytApiPromise = null;
				reject(new Error("YouTube IFrame API loaded but window.YT is missing"));
			}
		};

		if (!document.querySelector(`script[src="${YT_API_SRC}"]`)) {
			const tag = document.createElement("script");
			tag.src = YT_API_SRC;
			tag.onerror = () => {
				clearTimeout(timer);
				tag.remove();
				ytApiPromise = null;
				reject(new Error("Failed to load YouTube IFrame API script"));
			};
			document.head.appendChild(tag);
		}
	});

	return ytApiPromise;
}
