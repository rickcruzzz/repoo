/// <reference types="youtube" />
"use client";

import {
	useCallback,
	useEffect,
	useRef,
} from "@tiendanube/nube-sdk-react-runtime";
import { useContext } from "react";
import { reportInternalError } from "../../helpers/report-internal-error";
import { useNubeSDK } from "../../hooks/use-nube-sdk";
import { getYouTubeId } from "./helpers/get-youtube-id";
import { loadYouTubeIframeApi } from "./helpers/load-youtube";
import type {
	VideoYouTubeError,
	VideoYouTubeErrorCode,
	VideoYouTubeProps,
} from "./types.local";
import { VideoContext } from "./video-context";

const PROGRESS_INTERVAL_MS = 1000;

// The YouTube IFrame API reports errors as numeric codes; map each to a
// readable string for the app-facing payload.
// https://developers.google.com/youtube/iframe_api_reference#onError
const YT_ERROR_CODE: Record<number, VideoYouTubeErrorCode> = {
	2: "invalid_video_id",
	5: "html5_error",
	100: "video_not_found",
	101: "embedding_not_allowed",
	150: "embedding_not_allowed",
};

/**
 * `Video.YouTube` — a YouTube embed backed by the official IFrame Player API.
 * Must be a child of `Video.Root`, from which it inherits the playback
 * modifiers, source-agnostic event flags and bound emitter (via
 * {@link VideoContext}) — those cross the bridge as
 * `custom:videoRoot:<rootId>:<event>`. Source-specific errors are the player's
 * own concern: it emits them on its own channel, `custom:videoYouTube:<id>:error`.
 */
export function VideoYouTube({
	id,
	__internalId,
	src,
	controls = false,
	allowFullscreen = true,
	onError,
}: Readonly<VideoYouTubeProps>) {
	const ctx = useContext(VideoContext);

	const hostRef = useRef<HTMLDivElement>(null);
	const playerRef = useRef<YT.Player | null>(null);
	const ytRef = useRef<typeof YT | null>(null);
	const progressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
	const bufferingRef = useRef(false);

	const emit = ctx?.emit;
	const flags = ctx?.flags ?? {};

	// The player owns its source-specific errors on its own channel, keyed on the
	// player's `__internalId` (not Root's). Mirrors Video.Player's emitter.
	const { send } = useNubeSDK("adapter");
	const emitError = useCallback(
		(error: VideoYouTubeError) => {
			if (!__internalId) return;
			send(`custom:videoYouTube:${__internalId}:error`, () => ({
				ui: { values: { [__internalId]: error as unknown as string } },
			}));
		},
		[send, __internalId],
	);

	// Read emit/flags/error refs so the mount effect (keyed on videoId) never
	// re-runs when their identity changes as the SDK bridge connects.
	const emitRef = useRef(emit);
	emitRef.current = emit;
	const flagsRef = useRef(flags);
	flagsRef.current = flags;
	const emitErrorRef = useRef(emitError);
	emitErrorRef.current = emitError;
	const onErrorRef = useRef(onError);
	onErrorRef.current = onError;

	const videoId = getYouTubeId(src);

	// Unrecognised src surfaces as a source-specific error (mirrors Video.Player's
	// !safeSrc guard). `emitError` is in deps on purpose: its identity changes when
	// the bridge connects, so an error present at mount is re-emitted once live.
	useEffect(() => {
		if (src && !videoId && onError) {
			emitError({
				source: "video-youtube",
				code: "invalid_source",
				message: "Unrecognised YouTube video ID or URL",
			});
		}
	}, [src, videoId, onError, emitError]);

	// Mount the YouTube player once per videoId.
	useEffect(() => {
		if (!videoId || !hostRef.current) return;
		let destroyed = false;

		const clearProgress = () => {
			clearInterval(progressTimerRef.current ?? undefined);
			progressTimerRef.current = null;
		};

		const startProgress = (player: YT.Player) => {
			if (!flagsRef.current.onProgress) return;
			clearProgress();
			progressTimerRef.current = setInterval(() => {
				const ct = player.getCurrentTime();
				const dur = player.getDuration();
				const percent = dur > 0 ? Math.round((ct / dur) * 100) : 0;
				emitRef.current?.("progress", {
					percent,
					currentTime: ct,
					duration: dur,
				});
			}, PROGRESS_INTERVAL_MS);
		};

		const setBuffering = (buffering: boolean) => {
			if (!flagsRef.current.onBuffer) return;
			if (bufferingRef.current === buffering) return;
			bufferingRef.current = buffering;
			emitRef.current?.("buffer", { buffering });
		};

		loadYouTubeIframeApi()
			.then((yt) => {
				if (destroyed || !hostRef.current) return;
				ytRef.current = yt;

				const autoplay = ctx?.autoplay ?? false;
				const muted = ctx?.muted ?? false;
				const loop = ctx?.loop ?? false;

				playerRef.current = new yt.Player(hostRef.current, {
					videoId,
					host: "https://www.youtube-nocookie.com",
					width: "100%",
					height: "100%",
					playerVars: {
						modestbranding: 1,
						fs: allowFullscreen ? 1 : 0,
						controls: controls ? 1 : 0,
						rel: 0,
						playsinline: 1,
						iv_load_policy: 3,
						autoplay: autoplay ? 1 : 0,
						mute: autoplay || muted ? 1 : 0,
						...(loop ? { loop: 1, playlist: videoId } : {}),
					},
					events: {
						onStateChange: (e) => {
							const player = playerRef.current;
							if (!player) return;
							const currentTime = player.getCurrentTime();

							if (e.data === YT.PlayerState.PLAYING) {
								setBuffering(false);
								if (flagsRef.current.onPlay) {
									emitRef.current?.("play", { currentTime });
								}
								startProgress(player);
							} else if (e.data === YT.PlayerState.PAUSED) {
								clearProgress();
								setBuffering(false);
								if (flagsRef.current.onPause) {
									emitRef.current?.("pause", { currentTime });
								}
							} else if (e.data === YT.PlayerState.ENDED) {
								clearProgress();
								setBuffering(false);
								if (flagsRef.current.onEnded) {
									emitRef.current?.("ended", { currentTime });
								}
							} else if (e.data === YT.PlayerState.BUFFERING) {
								setBuffering(true);
							}
						},
						onError: (e) => {
							// Stop polling / clear buffering regardless of whether the app
							// observes onError, so no timer or buffer state leaks.
							clearProgress();
							setBuffering(false);
							if (!onErrorRef.current) return;
							emitErrorRef.current({
								source: "video-youtube",
								code: YT_ERROR_CODE[e.data] ?? "playback_error",
								message: `YouTube playback error (${e.data})`,
							});
						},
					},
				});
			})
			.catch(() => {
				// A failed API/engine load is an INTERNAL failure: the partner app
				// can't act on it, so it never reaches `onError`. Report it to the
				// host for observability (forwarded to Datadog).
				if (destroyed) return;
				reportInternalError({
					source: "video-youtube",
					code: "engine_load_failed",
					message: "Could not load the YouTube player",
				});
			});

		return () => {
			destroyed = true;
			clearProgress();
			playerRef.current?.destroy();
			playerRef.current = null;
			ytRef.current = null;
		};
		// Remount the player when videoId changes (new src). autoplay/muted/loop/controls
		// are consumed at init time — changes after mount are not reflected (YouTube
		// iframe API does not expose a hot-reload path for these).
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [videoId]);

	if (!videoId) return null;

	return (
		<div
			data-component-id={id}
			data-testid="yt"
			style={{ position: "relative", width: "100%", aspectRatio: "16/9" }}
		>
			<div ref={hostRef} style={{ width: "100%", height: "100%" }} />
		</div>
	);
}
