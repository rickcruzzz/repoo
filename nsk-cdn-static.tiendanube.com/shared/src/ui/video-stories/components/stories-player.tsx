import { useRef } from "@tiendanube/nube-sdk-react-runtime";
import type { MediaPlayerInstance } from "@vidstack/react";
import type { RefObject } from "react";
import type { VidstackBundle } from "../../video/helpers/load-vidstack";
import type { VideoStoriesItem } from "../types.local";
import { StoriesMuteButton } from "./stories-mute-button";

const PLAYER_CLASS = "nube-stories-player";

export type StoriesPlayerProps = {
	bundle: VidstackBundle | null;
	current: VideoStoriesItem;
	safeItemPoster: string | undefined;
	/** Whether the engine should be playing (fullscreen, or inline & visible, and
	 * the playlist hasn't finished). Gates autoplay and the canplay auto-resume. */
	shouldPlay: boolean;
	muted: boolean;
	playerRef: RefObject<MediaPlayerInstance>;
	/** Seek target (seconds) applied once on mount so an expand/close remount
	 * resumes where the previous instance left off. `0` = start from the top. */
	startAt: number;
	setMuted: (m: boolean) => void;
	onEnded: () => void;
	onError?: () => void;
};

export function StoriesPlayer({
	bundle,
	current,
	safeItemPoster,
	shouldPlay,
	muted,
	playerRef,
	startAt,
	setMuted,
	onEnded,
	onError,
}: StoriesPlayerProps) {
	// Reset per remount (keyed on src), so the seek runs once for this instance.
	const didSeek = useRef(false);

	if (!bundle) {
		return safeItemPoster ? (
			<img src={safeItemPoster} alt="" className="nube-stories-img" />
		) : null;
	}

	return (
		<bundle.MediaPlayer
			ref={playerRef}
			className={PLAYER_CLASS}
			src={current.src}
			viewType="video"
			streamType="on-demand"
			controls={false}
			autoPlay={shouldPlay}
			muted={muted}
			playsInline
			crossOrigin
			onCanPlay={() => {
				if (!didSeek.current) {
					didSeek.current = true;
					if (startAt > 0 && playerRef.current) {
						playerRef.current.currentTime = startAt;
					}
				}
				if (shouldPlay) {
					playerRef.current?.play().catch(() => {});
				}
			}}
			onEnded={onEnded}
			onError={onError}
		>
			<bundle.MediaProvider>
				{safeItemPoster && (
					<bundle.Poster className="vds-poster" src={safeItemPoster} alt="" />
				)}
			</bundle.MediaProvider>
			<StoriesMuteButton bundle={bundle} onMutedChange={setMuted} />
		</bundle.MediaPlayer>
	);
}
