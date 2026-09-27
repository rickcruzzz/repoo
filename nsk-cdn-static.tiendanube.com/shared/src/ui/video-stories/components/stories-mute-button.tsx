import { useEffect } from "@tiendanube/nube-sdk-react-runtime";
import type { VidstackBundle } from "../../video/helpers/load-vidstack";
import { IconMuted, IconUnmuted } from "./icons";

export type StoriesMuteButtonProps = {
	bundle: VidstackBundle;
	onMutedChange: (muted: boolean) => void;
};

/**
 * Vidstack's own mute control rendered INSIDE `<MediaPlayer>` so `useMediaState`
 * has the media context. Syncs the engine's muted state back to the parent so it
 * persists across item remounts.
 */
export function StoriesMuteButton({
	bundle,
	onMutedChange,
}: StoriesMuteButtonProps) {
	const { MuteButton, useMediaState } = bundle;
	const muted = useMediaState("muted");
	const volume = useMediaState("volume");
	const isMuted = Boolean(muted) || volume === 0;

	useEffect(() => {
		onMutedChange(Boolean(muted));
	}, [muted, onMutedChange]);

	return (
		<div
			className="nube-stories-btn nube-stories-mute"
			onPointerDown={(e) => e.stopPropagation()}
		>
			<MuteButton className="vds-button">
				{isMuted ? <IconMuted /> : <IconUnmuted />}
			</MuteButton>
		</div>
	);
}
