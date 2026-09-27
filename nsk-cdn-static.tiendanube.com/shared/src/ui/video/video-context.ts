import { createContext } from "react";
import type { ReactNode } from "react";

/**
 * The source-agnostic playback events emitted by `Video.Root`, mapped to their
 * payload shape. These are identical across every video source, so they live on
 * Root. Errors are NOT here: they are source-specific and belong to each player
 * (see `Video.Player`'s own `onError`).
 */
export type VideoEventMap = {
	play: { currentTime: number };
	pause: { currentTime: number };
	ended: { currentTime: number };
	progress: { percent: number; currentTime: number; duration: number };
	buffer: { buffering: boolean };
	/** The expanded view (lightbox) opened. `currentTime` is best-effort. */
	open: { currentTime?: number };
	/** The expanded view closed/collapsed (lightbox), or the fullscreen overlay
	 * closed (emitted by the host, without `currentTime`). */
	close: { currentTime?: number };
};

/**
 * Emits a video event over the bridge as `custom:videoRoot:<rootId>:<event>`.
 * Generic over {@link VideoEventMap} so each event only accepts its own payload.
 */
export type VideoEmit = <E extends keyof VideoEventMap>(
	event: E,
	value: VideoEventMap[E],
) => void;

/** Which source-agnostic playback events the app is observing (booleans on the wire). */
export type VideoEventFlags = {
	onPlay?: boolean;
	onPause?: boolean;
	onEnded?: boolean;
	onProgress?: boolean;
	onBuffer?: boolean;
	/** Fullscreen overlay opened. Emitted by `Video.Root` when it mounts fullscreen. */
	onOpen?: boolean;
	/** Fullscreen overlay closed. Emitted by the host (see `FullscreenContent`). */
	onClose?: boolean;
};

/**
 * Shared state provided by `Video.Root` and consumed by `Video.Player`:
 * the bound emitter (keyed on the Root's `__internalId`), the source-agnostic
 * playback modifiers, the event flags, the overlay children to render on top of
 * the video, and whether the video is in fullscreen mode.
 */
export type VideoContextValue = {
	rootInternalId: string;
	emit: VideoEmit;
	autoplay?: boolean;
	muted?: boolean;
	loop?: boolean;
	flags: VideoEventFlags;
	overlay: ReactNode;
	/**
	 * True when the video is rendered inside the fullscreen overlay host (see
	 * {@link FullscreenModeContext}). `Video.Root` folds it in here so `Video.Player`
	 * can adapt (fill the stage, always show the overlay, drop the lightbox
	 * trigger) without the app passing any prop.
	 */
	fullscreen?: boolean;
};

export const VideoContext = createContext<VideoContextValue | null>(null);

/**
 * Signals that descendants are rendered inside the fullscreen overlay host
 * (`FullscreenContent`, the `fullscreen_content` slot). The host provides `true`;
 * everywhere else it is `false`. This is how "fullscreen" is deduced from PLACEMENT
 * — an internal implementation detail — instead of an app-facing prop.
 */
export const FullscreenModeContext = createContext<boolean>(false);
