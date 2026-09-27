import { useEffect } from "@tiendanube/nube-sdk-react-runtime";
import type { MediaPlayerInstance } from "@vidstack/react";
import type { RefObject } from "react";

type PlayerPlaybackOptions = {
	playerRef: RefObject<MediaPlayerInstance>;
	/** Play when true, pause otherwise. */
	shouldPlay: boolean;
	/** Re-reconcile when the mounted instance changes (item advance / engine load). */
	instanceKey: unknown;
};

/**
 * Drives the single live player (only one instance is mounted at a time, so
 * `playerRef` always points at it): plays while `shouldPlay`, pauses otherwise.
 * `instanceKey` re-runs the effect when the underlying instance is swapped.
 */
export function usePlayerPlayback({
	playerRef,
	shouldPlay,
	instanceKey,
}: PlayerPlaybackOptions) {
	useEffect(() => {
		const p = playerRef.current;
		if (!p) return;

		if (shouldPlay) {
			p.play().catch(() => {});
		} else {
			p.pause();
		}
	}, [playerRef, shouldPlay, instanceKey]);
}
