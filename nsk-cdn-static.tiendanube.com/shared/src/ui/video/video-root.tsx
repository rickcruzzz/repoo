"use client";

import {
	useCallback,
	useEffect,
	useMemo,
} from "@tiendanube/nube-sdk-react-runtime";
import React, { type ReactElement, type ReactNode, useContext } from "react";
import { useNubeSDK } from "../../hooks/use-nube-sdk";
import type { VideoRootProps } from "./types.local";
import {
	FullscreenModeContext,
	VideoContext,
	type VideoContextValue,
} from "./video-context";
import { VideoPlayer } from "./video-player";
import { VideoYouTube } from "./video-youtube";

type DynamicChild = ReactElement<{ component?: { type?: string } }>;

const PLAYER_DYNAMIC_TYPES = new Set(["videoPlayer", "videoYouTube"]);
const PLAYER_COMPONENTS = new Set<unknown>([VideoPlayer, VideoYouTube]);

/**
 * Identifies a player child (`Video.Player` or `Video.YouTube`) among Root's
 * children. Two paths (mirrors the form's conditional-children detection):
 *  - worker → main pipeline: each child is wrapped by `DynamicRender`, exposing
 *    the JSON tree type as `props.component.type`.
 *  - direct React rendering (tests / dev tooling): the child's function type is
 *    the component itself.
 */
function isPlayerChild(child: ReactElement): boolean {
	const dynamicType = (child as DynamicChild).props?.component?.type;
	if (dynamicType) return PLAYER_DYNAMIC_TYPES.has(dynamicType);
	return PLAYER_COMPONENTS.has(child.type);
}

/**
 * Splits Root's children into the single player element and the overlay nodes
 * (everything else). The first player wins; any extra players fall through to
 * the overlay bucket rather than being dropped.
 */
export function partitionChildren(children: ReactNode): {
	player: ReactNode;
	overlay: ReactNode[];
} {
	let player: ReactNode = null;
	const overlay: ReactNode[] = [];
	React.Children.forEach(children, (child) => {
		if (
			player === null &&
			React.isValidElement(child) &&
			isPlayerChild(child)
		) {
			player = child;
			return;
		}
		overlay.push(child);
	});
	return { player, overlay };
}

/**
 * `Video.Root` — the source-agnostic wrapper for a video. Owns layout, the
 * shared playback modifiers and the playback events, and provides them (plus a
 * bound emitter keyed on its `__internalId`) to the child `Video.Player` or
 * `Video.YouTube` through {@link VideoContext}. Overlay children render over
 * the video when the player's lightbox is open, or always in fullscreen.
 *
 * When rendered inside the fullscreen overlay host (see {@link FullscreenModeContext})
 * it fills the stage and folds `fullscreen` into {@link VideoContext} so the player
 * adapts — the app opts in only by placing the video in the `fullscreen_content`
 * slot, never via a prop.
 *
 * Events cross the bridge as `custom:videoRoot:<__internalId>:<event>`; the
 * worker's `setupComponentEventListeners` auto-registers the app's declared
 * `onPlay`/`onPause`/… handlers on those exact strings.
 */
export function VideoRoot({
	id,
	__internalId,
	width = "100%",
	height,
	style,
	autoplay,
	muted,
	loop,
	onPlay,
	onPause,
	onEnded,
	onProgress,
	onBuffer,
	onOpen,
	onClose,
	children,
}: Readonly<VideoRootProps>) {
	const { send } = useNubeSDK("adapter");
	const fullscreen = useContext(FullscreenModeContext);

	const emit = useCallback(
		(event: string, value: unknown) => {
			send(`custom:videoRoot:${__internalId}:${event}`, () => ({
				// Video events carry structured payloads (e.g. {percent,...}).
				// The values channel is typed `string` but carries structured data
				// across the bridge via structured clone — the same pattern
				// `iframe`'s `onMessage` (JsonObject) relies on.
				ui: { values: { [__internalId]: value as string } },
			}));
		},
		[send, __internalId],
	);

	useEffect(() => {
		if (fullscreen && onOpen) emit("open", {});
	}, [fullscreen, onOpen, emit]);

	const { player, overlay } = useMemo(
		() => partitionChildren(children),
		[children],
	);

	const contextValue = useMemo<VideoContextValue>(
		() => ({
			rootInternalId: __internalId,
			emit,
			autoplay,
			muted,
			loop,
			flags: {
				onPlay,
				onPause,
				onEnded,
				onProgress,
				onBuffer,
				onOpen,
				onClose,
			},
			overlay,
			fullscreen,
		}),
		[
			__internalId,
			emit,
			autoplay,
			muted,
			loop,
			onPlay,
			onPause,
			onEnded,
			onProgress,
			onBuffer,
			onOpen,
			onClose,
			overlay,
			fullscreen,
		],
	);

	return (
		<VideoContext.Provider value={contextValue}>
			<div
				className="nube-video"
				id={__internalId}
				data-component-id={id}
				style={{
					width,
					height,
					maxWidth: "100%",
					...style,
					...(fullscreen ? { width: "100%", height: "100%" } : {}),
				}}
			>
				{player}
			</div>
		</VideoContext.Provider>
	);
}
