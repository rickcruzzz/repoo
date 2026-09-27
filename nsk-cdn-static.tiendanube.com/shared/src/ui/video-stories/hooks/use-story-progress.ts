import { useEffect } from "@tiendanube/nube-sdk-react-runtime";
import type { MediaPlayerInstance } from "@vidstack/react";
import type { RefObject } from "react";

type StoryProgressOptions = {
	playerRef: RefObject<MediaPlayerInstance>;
	/** The active progress segment's fill; its `scaleX` is written on each update. */
	fillRef: RefObject<HTMLElement>;
	/** Re-subscribe whenever the mounted player instance is swapped (remount). */
	instanceKey: unknown;
};

/**
 * Drives the active progress bar from the engine's reactive state instead of the
 * coarse `timeupdate` event. `player.subscribe` fires whenever state changes, and
 * `state.currentTime` is refreshed by Vidstack's own ~60fps rAF loop — so this is
 * the same clock that drives Vidstack's built-in slider, with the play/pause
 * lifecycle handled inside the engine. We write `scaleX` straight to the DOM (no
 * React state → no re-render), so the bar tracks real playback with no lag.
 */
export function useStoryProgress({
	playerRef,
	fillRef,
	instanceKey,
}: StoryProgressOptions) {
	// instanceKey re-runs this when the player instance is swapped (the ref itself
	// isn't reactive), so we re-subscribe to the live instance on every remount.
	useEffect(() => {
		const player = playerRef.current;

		if (!player) return;

		return player.subscribe(({ currentTime, duration }) => {
			const fill = fillRef.current;

			if (!fill) return;

			fill.style.transform = `scaleX(${duration > 0 ? currentTime / duration : 0})`;
		});
	}, [playerRef, fillRef, instanceKey]);
}
