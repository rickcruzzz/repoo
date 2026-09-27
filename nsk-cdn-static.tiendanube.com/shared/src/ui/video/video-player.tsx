"use client";

import {
	useCallback,
	useEffect,
	useRef,
	useState,
} from "@tiendanube/nube-sdk-react-runtime";
import type {
	MediaErrorCode,
	MediaErrorDetail,
	MediaPlayerInstance,
	MediaPlayerProps,
	MediaTimeUpdateEventDetail,
} from "@vidstack/react";
import { useContext } from "react";
import { useNubeSDK } from "../../hooks/use-nube-sdk";
import { isSafeMediaUrl } from "./helpers/is-safe-media-url";
import { useVidstackBundle } from "./helpers/use-vidstack-bundle";
import type {
	VideoPlayerError,
	VideoPlayerErrorCode,
	VideoPlayerProps,
} from "./types.local";
import { VideoContext } from "./video-context";

const PROGRESS_INTERVAL_MS = 1000;
const STYLE_ID = "nube-video-vidstack-styles";

// The HTML media element reports errors as a numeric `MediaError.code` (1–4);
// map each to a readable string for the app-facing payload.
// https://developer.mozilla.org/en-US/docs/Web/API/MediaError/code
const MEDIA_ERROR_CODE: Record<MediaErrorCode, VideoPlayerErrorCode> = {
	1: "media_err_aborted",
	2: "media_err_network",
	3: "media_err_decode",
	4: "media_err_src_not_supported",
};

/**
 * `Video.Player` — a self-hosted source (MP4 / HLS / DASH) rendered by the
 * lazily-loaded Vidstack engine. Must be a child of `Video.Root`, from which it
 * inherits the playback modifiers, source-agnostic event flags, bound emitter
 * and overlay children (via {@link VideoContext}) — those cross the bridge as
 * `custom:videoRoot:<rootId>:<event>`. Source-specific errors are the player's
 * own concern: it emits them on its own channel, `custom:videoPlayer:<id>:error`.
 *
 * Three presentation modes: inline (default), lightbox (`lightbox` prop, an
 * expandable fixed overlay), and fullscreen (when `ctx.fullscreen` is set by the
 * host — fills the stage, letterboxes to the video's ratio, always shows the
 * overlay, drops the lightbox trigger; the host owns the dialog/close).
 */
export function VideoPlayer({
	id,
	__internalId,
	src,
	poster,
	controls = true,
	aspectRatio = "16/9",
	lightbox,
	onError,
}: Readonly<VideoPlayerProps>) {
	const ctx = useContext(VideoContext);
	const isFullscreen = !!ctx?.fullscreen;
	const { bundle } = useVidstackBundle(STYLE_ID, "video-player", true);
	const [lightboxOpen, setLightboxOpen] = useState(false);

	const playerRef = useRef<MediaPlayerInstance | null>(null);
	const lastProgressAt = useRef(0);
	const durationRef = useRef(0);
	const bufferingRef = useRef(false);
	// Lightbox focus management: the dialog to focus on open, and the element to
	// return focus to on close (the trigger that launched it).
	const dialogRef = useRef<HTMLDivElement>(null);
	const restoreFocusRef = useRef<HTMLElement | null>(null);

	const emit = ctx?.emit;
	const flags = ctx?.flags ?? {};
	const safeSrc = isSafeMediaUrl(src) ? src : undefined;

	// The player owns its source-specific errors on its own channel, keyed on the
	// player's `__internalId` (not Root's). Mirrors Root's emitter/bridge cast.
	const { send } = useNubeSDK("adapter");
	const emitError = useCallback(
		(error: VideoPlayerError) => {
			if (!__internalId) return;
			send(`custom:videoPlayer:${__internalId}:error`, () => ({
				ui: { values: { [__internalId]: error as unknown as string } },
			}));
		},
		[send, __internalId],
	);

	// An unsafe/unsupported source surfaces as an error (covers 404/unavailable).
	// `emitError` is in deps on purpose: its identity changes when the SDK bridge
	// connects, so a bad src present at mount (when `send` is still a no-op) is
	// re-emitted once the bridge is live rather than lost.
	useEffect(() => {
		if (src && !safeSrc && onError) {
			emitError({
				source: "video-player",
				code: "invalid_source",
				message: "Unsupported or unsafe video URL",
			});
		}
	}, [src, safeSrc, onError, emitError]);

	// While the lightbox is open: lock body scroll, move focus into the dialog
	// (restoring it to the trigger on close) and close on Escape. `aria-modal`
	// already makes the rest of the page inert for assistive tech.
	useEffect(() => {
		if (!lightbox || !lightboxOpen || typeof document === "undefined") return;
		const prevOverflow = document.body.style.overflow;
		document.body.style.overflow = "hidden";

		// Remember the trigger and move focus into the dialog.
		restoreFocusRef.current = document.activeElement as HTMLElement | null;
		dialogRef.current?.focus();

		const onKey = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				e.stopPropagation();
				setLightboxOpen(false);
			}
		};
		document.addEventListener("keydown", onKey, true);
		return () => {
			document.body.style.overflow = prevOverflow;
			document.removeEventListener("keydown", onKey, true);
			// Return focus to whatever launched the lightbox.
			restoreFocusRef.current?.focus?.();
		};
	}, [lightbox, lightboxOpen]);

	const currentTime = () => {
		const t = playerRef.current?.currentTime;
		return typeof t === "number" && Number.isFinite(t) ? t : 0;
	};

	const handleTimeUpdate = (time: number) => {
		if (!flags.onProgress) return;
		const now = Date.now();
		if (now - lastProgressAt.current < PROGRESS_INTERVAL_MS) return;
		lastProgressAt.current = now;
		const duration = durationRef.current;
		const percent = duration > 0 ? Math.round((time / duration) * 100) : 0;
		emit?.("progress", { percent, currentTime: time, duration });
	};

	const setBuffering = (buffering: boolean) => {
		if (!flags.onBuffer) return;
		if (bufferingRef.current === buffering) return;
		bufferingRef.current = buffering;
		emit?.("buffer", { buffering });
	};

	if (!safeSrc) return null;

	const safePoster = isSafeMediaUrl(poster) ? poster : undefined;
	const inlineStyle: MediaPlayerProps["style"] = {
		width: "100%",
		maxWidth: "100%",
	};

	// Placeholder when the engine is still loading. In fullscreen the poster is
	// contained (not the inline 16/9 crop) so a vertical poster keeps its ratio.
	if (!bundle) {
		if (isFullscreen) {
			return (
				<div className="nube-video-fullscreen">
					{safePoster && (
						<img
							className="nube-video-fullscreen-poster"
							src={safePoster}
							alt=""
						/>
					)}
				</div>
			);
		}

		return (
			<div className="nube-video-loading" style={inlineStyle}>
				{safePoster && <img src={safePoster} alt="" />}
			</div>
		);
	}

	const {
		MediaPlayer,
		MediaProvider,
		Poster,
		DefaultVideoLayout,
		defaultLayoutIcons,
	} = bundle;

	// Replacement for Vidstack's built-in fullscreen button: same control-bar
	// slot/position, but opens our overlay instead of native fullscreen.
	// Styled as a `vds-button` so it inherits the engine's chrome.
	const lightboxTriggerButton = (
		<button
			type="button"
			className="vds-fullscreen-button vds-button"
			aria-label="Enter fullscreen"
			onClick={() => setLightboxOpen(true)}
		>
			<svg
				width="24"
				height="24"
				viewBox="0 0 24 24"
				fill="none"
				aria-hidden="true"
			>
				<path
					d="M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M8 21H5a2 2 0 0 1-2-2v-3M16 21h3a2 2 0 0 0 2-2v-3"
					stroke="currentColor"
					strokeWidth="2"
					strokeLinecap="round"
					strokeLinejoin="round"
				/>
			</svg>
		</button>
	);

	const lightboxCloseButton = (
		<button
			type="button"
			className="vds-fullscreen-button vds-button"
			aria-label="Exit fullscreen"
			onClick={() => setLightboxOpen(false)}
		>
			<svg
				width="24"
				height="24"
				viewBox="0 0 24 24"
				fill="none"
				aria-hidden="true"
			>
				<path
					d="M8 3v3a2 2 0 0 1-2 2H3M16 3v3a2 2 0 0 0 2 2h3M8 21v-3a2 2 0 0 0-2-2H3M16 21v-3a2 2 0 0 1 2-2h3"
					stroke="currentColor"
					strokeWidth="2"
					strokeLinecap="round"
					strokeLinejoin="round"
				/>
			</svg>
		</button>
	);

	// `undefined` keeps Vidstack's native button. In fullscreen there is NO
	// fullscreen/lightbox control (we're already fullscreen; the host owns the
	// close). With the lightbox enabled we swap the control-bar slot between the
	// trigger (inline) and its opposite (open); otherwise Vidstack's native button.
	const fullscreenButton = isFullscreen
		? null
		: lightbox
			? lightboxOpen
				? lightboxCloseButton
				: lightboxTriggerButton
			: undefined;

	// Fullscreen fills the stage; lightbox-open fills its stage; else inline box.
	const playerStyle: MediaPlayerProps["style"] =
		isFullscreen || lightboxOpen
			? {
					width: "100%",
					height: isFullscreen ? "100%" : undefined,
					maxWidth: "100%",
				}
			: inlineStyle;

	const player = (
		<MediaPlayer
			// Re-key on source change
			key={safeSrc}
			ref={playerRef}
			src={safeSrc}
			className={isFullscreen ? "nube-video-fullscreen-player" : undefined}
			viewType="video"
			streamType="on-demand"
			controls={false}
			autoPlay={ctx?.autoplay}
			muted={ctx?.muted || ctx?.autoplay}
			loop={ctx?.loop}
			playsInline
			crossOrigin
			aspectRatio={aspectRatio}
			style={playerStyle}
			onPlay={() =>
				flags.onPlay && emit?.("play", { currentTime: currentTime() })
			}
			onPause={() =>
				flags.onPause && emit?.("pause", { currentTime: currentTime() })
			}
			onEnded={() =>
				flags.onEnded && emit?.("ended", { currentTime: currentTime() })
			}
			onError={(detail: MediaErrorDetail) =>
				onError &&
				emitError({
					source: "video-player",
					code: detail?.code ? MEDIA_ERROR_CODE[detail.code] : "playback_error",
					message: detail?.message || "Video playback error",
				})
			}
			onDurationChange={(duration: number) => {
				if (typeof duration === "number" && Number.isFinite(duration)) {
					durationRef.current = duration;
				}
			}}
			onTimeUpdate={(detail: MediaTimeUpdateEventDetail) =>
				handleTimeUpdate(
					typeof detail?.currentTime === "number" ? detail.currentTime : 0,
				)
			}
			onWaiting={() => setBuffering(true)}
			onPlaying={() => setBuffering(false)}
			data-component-id={id}
		>
			<MediaProvider>
				{safePoster && (
					<Poster className="vds-poster" src={safePoster} alt="" />
				)}
			</MediaProvider>
			{controls && (
				<DefaultVideoLayout
					icons={defaultLayoutIcons}
					// Fullscreen forces the large layout: it keeps every control in the
					// bottom bar. The small (mobile) layout puts the mute top-right,
					// colliding with the host's top-right close button.
					smallLayoutWhen={isFullscreen ? false : undefined}
					slots={{
						googleCastButton: null,
						airPlayButton: null,
						settingsMenu: null,
						fullscreenButton,
					}}
				/>
			)}
		</MediaPlayer>
	);

	// Fullscreen: the host owns the dialog/backdrop/close; here we render the media
	// stage filling it, with the app's overlay children always on top.
	if (isFullscreen) {
		return (
			<div className="nube-video-fullscreen">
				{player}
				{ctx?.overlay && (
					<div className="nube-video-fullscreen-overlay">{ctx.overlay}</div>
				)}
			</div>
		);
	}

	// No lightbox → inline player with Vidstack's native fullscreen button.
	if (!lightbox) return player;

	// Lightbox mode: the same <MediaPlayer> instance is always rendered at the
	// same position in the React tree (key never changes). When the lightbox
	// opens, the outer wrapper gains `nube-video-lightbox` (position:fixed) and
	// the player is scaled up; when it closes, the wrapper reverts to inline.
	// This keeps playback state (currentTime, buffered range, etc.) across the
	// toggle because React updates the component in-place instead of remounting.
	return (
		<div
			ref={dialogRef}
			role={lightboxOpen ? "dialog" : undefined}
			aria-modal={lightboxOpen ? "true" : undefined}
			aria-label={lightboxOpen ? "Video" : undefined}
			tabIndex={lightboxOpen ? -1 : undefined}
			className={lightboxOpen ? "nube-video-lightbox" : undefined}
		>
			<div
				className={lightboxOpen ? "nube-video-stage" : undefined}
				style={lightboxOpen ? undefined : inlineStyle}
			>
				{player}
				{/* Overlay children (Video.Root's) render ON TOP of the video. */}
				{lightboxOpen && ctx?.overlay && (
					<div className="nube-video-overlay">{ctx.overlay}</div>
				)}
			</div>
			{/* Close button is mandatory in the lightbox (RFC requirement). */}
			{lightboxOpen && (
				<button
					type="button"
					aria-label="Close video"
					onClick={() => setLightboxOpen(false)}
					className="nube-video-close"
				>
					✕
				</button>
			)}
		</div>
	);
}
