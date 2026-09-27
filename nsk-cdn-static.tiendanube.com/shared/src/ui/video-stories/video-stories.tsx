"use client";

/**
 * `VideoStories` — a vertical, stories-style player for a sequence of self-hosted
 * videos (Instagram/WhatsApp-style). It uses Vidstack engine thru `useVidstackBundle`
 * and renders the `MediaPlayer` engine directly instead of using `videoRoot` and
 * `videoPlayer` components.
 *
 * Two mount sites: the player renders IN-FLOW inside the anchor card; expanding
 * renders a separate instance portaled to `document.body` as an `inset:0`
 * backdrop (the portal escapes theme ancestors with `transform`/`filter`/`contain`
 * that would otherwise trap `position:fixed`). Only ONE instance is mounted at a
 * time — inline while closed, fullscreen while open — so `playerRef` always points
 * at the live one. The expand/close toggle therefore REMOUNTS the player; playback
 * resumes (not continuous) by carrying `currentTime` across via `resumeAt` and
 * seeking in `onCanPlay`. Advancing to a new item, by contrast, only swaps `src`
 * on the SAME element (no `key`) so there's no black teardown gap between stories.
 * The card autoplays (muted) only while at least half on screen, so N stories on
 * a page don't all decode at once.
 *
 * Styling: static chrome lives in `styles/video.css` as `.nube-stories-*` classes
 * (injected via `style.css` → the adapter Loader, same as `video-player`); only
 * DYNAMIC values are inline (progress-fill width and the anchor `width`). NOTE: the
 * overlay is portaled to `<body>`, so global CSS classes apply but slot-scoped
 * `styled()` does NOT — app overlay `children` must be styled with inline `style`,
 * not `styled()`.
 *
 * Bridge events (open/close/change/complete) are emitted only for the app to
 * *observe*; they never gate playback. Registered as `videoStories`.
 */

import { useRef, useState } from "@tiendanube/nube-sdk-react-runtime";
import type { MediaPlayerInstance } from "@vidstack/react";
import { createPortal } from "react-dom";
import { isSafeMediaUrl } from "../video/helpers/is-safe-media-url";
import { useVidstackBundle } from "../video/helpers/use-vidstack-bundle";
import { StoriesFrame } from "./components/stories-frame";
import { StoriesPlayer } from "./components/stories-player";
import { StoriesProgress } from "./components/stories-progress";
import { useFullscreenNav } from "./hooks/use-fullscreen-nav";
import { useInlineVisibility } from "./hooks/use-inline-visibility";
import { usePlayerPlayback } from "./hooks/use-player-playback";
import { useStoriesEmitter } from "./hooks/use-stories-emitter";
import { useStoryProgress } from "./hooks/use-story-progress";

import type { VideoStoriesProps } from "./types.local";

// Injected engine theme CSS gets its own <style>; the stories chrome (including
// the `.nube-stories-player` fill rule) lives in styles/video.css.
const STYLE_ID = "nube-video-stories-styles";
// Press-and-hold longer than this (ms) pauses; a shorter press is a nav tap.
const HOLD_MS = 200;

export function VideoStories({
	id,
	__internalId,
	items,
	width = "100%",
	startMuted,
	pauseOnHold = true,
	tapToNavigate = true,
	autoAdvance = true,
	loop = false,
	style,
	onOpen,
	onClose,
	onChange,
	onComplete,
	onError,
	children,
}: Readonly<VideoStoriesProps>) {
	// No layout CSS: stories draw their own chrome (only the base theme CSS,
	// which styles the `.vds-button` mute control, is needed).
	const { bundle } = useVidstackBundle(STYLE_ID, "video-stories");
	const emit = useStoriesEmitter(__internalId, {
		onOpen,
		onClose,
		onChange,
		onComplete,
		onError,
	});

	const [open, setOpen] = useState(false);
	const [index, setIndex] = useState(0);
	const [muted, setMuted] = useState(startMuted ?? true);
	// True after a non-looping playlist reaches the end: rewound to the first
	// story but held paused, so it neither loops nor sits on an ended frame.
	// Cleared by the next user intent (expand / nav tap).
	const [completed, setCompleted] = useState(false);

	const anchorRef = useRef<HTMLDivElement>(null);
	const playerRef = useRef<MediaPlayerInstance>(null);
	const holdTimer = useRef<number | null>(null);
	const didHold = useRef(false);
	// currentTime captured at an expand/close toggle, seeked on the next mount so
	// the remounted instance resumes where the previous one left off.
	const resumeAt = useRef(0);
	const activeFillRef = useRef<HTMLDivElement>(null);
	// Tracks consecutive playback errors to break auto-advance loops when every
	// remaining source is broken. Reset to 0 whenever a story plays through cleanly.
	const consecutiveErrors = useRef(0);

	const safeItems = (items ?? []).filter((it) => it && isSafeMediaUrl(it.src));
	const total = safeItems.length;

	const inlineVisible = useInlineVisibility(anchorRef);

	// Identifies the live player instance so instance-scoped effects re-run on a
	// remount — which happens on item advance (`index`), engine load (`bundle`),
	// and expand/close (`open` moves the player between mount sites).
	const playerInstanceKey = `${open}:${index}:${bundle ? "ready" : "loading"}`;

	// Play when fullscreen (always) or inline & visible — unless the playlist has
	// finished (held paused until the next user intent).
	const shouldPlay = !completed && (open || inlineVisible);

	// Only one instance is mounted at a time, so this drives whichever is live.
	usePlayerPlayback({
		playerRef,
		shouldPlay,
		instanceKey: playerInstanceKey,
	});

	useStoryProgress({
		playerRef,
		fillRef: activeFillRef,
		instanceKey: playerInstanceKey,
	});

	useFullscreenNav({
		open,
		onEscape: () => close(),
		onPrev: () => goTo(index - 1),
		onNext: () => goTo(index + 1),
	});

	const close = () => {
		// Remount the inline instance where fullscreen left off.
		resumeAt.current = playerRef.current?.currentTime ?? 0;
		setOpen(false);
		emit("close", { index });
	};

	// Inline → fullscreen at the current item: remounts, but resumes from the
	// inline instance's currentTime (captured here, seeked on the next mount). If
	// the playlist had finished it's already rewound to index 0 — start from the top.
	const expand = () => {
		resumeAt.current = completed ? 0 : playerRef.current?.currentTime ?? 0;
		setCompleted(false);
		setOpen(true);
		emit("open", { index, total });
	};

	// Local sequence control — no worker round-trip. Past the last item it either
	// loops back to the first or finishes; before the first it stays put.
	const goTo = (i: number) => {
		if (i < 0) return;

		if (i >= total) {
			if (loop) {
				// Restart the playlist; a lap emits `change`, not `complete`.
				resumeAt.current = 0;
				setIndex(0);
				emit("change", { index: 0 });

				return;
			}
			// Finished: emit once, close the overlay if fullscreen, then rewind and
			// hold paused (`completed`). `resumeAt`/`index` are set AFTER close() so
			// its currentTime capture can't clobber the rewind.
			emit("complete", { total });

			if (open) {
				setOpen(false);
				emit("close", { index });
			}
			resumeAt.current = 0;
			setIndex(0);
			setCompleted(true);

			return;
		}
		// A valid move: clear any finished state and start the item from the top.
		// The new active segment resets to scaleX(0) via CSS on the re-render below.
		setCompleted(false);
		resumeAt.current = 0;
		setIndex(i);
		emit("change", { index: i });
	};

	// Advance on end only when auto-advance is on; otherwise stop on the last frame.
	const handleEnded = () => {
		consecutiveErrors.current = 0;
		if (autoAdvance) goTo(index + 1);
	};

	// Report the failure and skip to the next story when auto-advance is on.
	// The consecutive-error counter prevents an infinite loop when every remaining
	// source is broken: once it reaches `total`, stop advancing and leave the
	// current (failed) item in place rather than cycling forever.
	const handleError = () => {
		consecutiveErrors.current += 1;
		emit("error", { index });
		if (autoAdvance && consecutiveErrors.current < total) goTo(index + 1);
	};

	// Hold-to-pause: a press held past HOLD_MS pauses; releasing resumes and
	// suppresses the ensuing nav click so a long press never also navigates.
	const startHold = () => {
		if (!pauseOnHold) return;

		didHold.current = false;
		holdTimer.current = window.setTimeout(() => {
			didHold.current = true;
			playerRef.current?.pause();
		}, HOLD_MS);
	};
	const endHold = () => {
		if (holdTimer.current != null) {
			clearTimeout(holdTimer.current);
			holdTimer.current = null;
		}
		if (didHold.current) playerRef.current?.play().catch(() => {});
	};
	const navTap = (delta: number) => {
		if (didHold.current) {
			didHold.current = false;
			return;
		}
		goTo(index + delta);
	};

	if (total === 0) return null;

	const current = safeItems[index];
	if (!current) return null;

	const safeItemPoster = isSafeMediaUrl(current.poster)
		? current.poster
		: undefined;

	// One frame builder for both mount sites; `isOpen` flips the player between
	// inline and fullscreen behaviour and swaps the frame chrome (docked expand
	// button vs. fullscreen nav/close).
	const renderFrame = (isOpen: boolean) => (
		<StoriesFrame
			open={isOpen}
			playerNode={
				<StoriesPlayer
					bundle={bundle}
					current={current}
					safeItemPoster={safeItemPoster}
					shouldPlay={shouldPlay}
					muted={muted}
					playerRef={playerRef}
					startAt={resumeAt.current}
					setMuted={setMuted}
					onEnded={handleEnded}
					onError={handleError}
				/>
			}
			progressNode={
				<StoriesProgress
					items={safeItems}
					index={index}
					activeFillRef={activeFillRef}
				/>
			}
			tapToNavigate={tapToNavigate}
			onPointerDown={startHold}
			onPointerUp={endHold}
			onNavPrev={() => navTap(-1)}
			onNavNext={() => navTap(1)}
			onClose={close}
			onExpand={expand}
		>
			{children}
		</StoriesFrame>
	);

	// Fullscreen: a separate instance portaled to <body> as an inset:0 backdrop.
	// The portal escapes transform/filter/contain ancestors; no rect tracking.
	const overlay =
		open && typeof document !== "undefined"
			? createPortal(
					<div className="nube-stories-container--fullscreen">
						{renderFrame(true)}
					</div>,
					document.body,
				)
			: null;

	// The player renders in-flow inside the anchor card; tapping the expand button
	// opens the fullscreen overlay. While open the in-flow instance is unmounted
	// (it sits behind the opaque backdrop anyway) so only one instance ever plays.
	return (
		<>
			<div
				ref={anchorRef}
				className="nube-video-stories nube-stories-anchor"
				id={__internalId}
				data-component-id={id}
				style={{ width, ...style }}
			>
				{open ? null : renderFrame(false)}
			</div>
			{overlay}
		</>
	);
}
