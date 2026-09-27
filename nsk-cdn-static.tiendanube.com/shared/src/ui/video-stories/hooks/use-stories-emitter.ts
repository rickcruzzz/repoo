import { useCallback } from "@tiendanube/nube-sdk-react-runtime";
import { useNubeSDK } from "../../../hooks/use-nube-sdk";

type StoriesEventFlags = {
	onOpen?: boolean;
	onClose?: boolean;
	onChange?: boolean;
	onComplete?: boolean;
	onError?: boolean;
};

/**
 * Bridge emitter for the observe-only VideoStories events (open/close/change/
 * complete/error). Structured payloads ride the string-typed `values` channel
 * via structured clone — same pattern as Video.Root's emitter.
 *
 * Only emits for events whose corresponding flag is `true`, so call sites can
 * emit unconditionally without checking the flags themselves.
 */
export function useStoriesEmitter(
	internalId: string,
	flags: StoriesEventFlags,
) {
	const { send } = useNubeSDK("adapter");
	const { onOpen, onClose, onChange, onComplete, onError } = flags;

	return useCallback(
		(event: string, value: unknown) => {
			if (!internalId) return;

			if (
				!(
					(event === "open" && onOpen) ||
					(event === "close" && onClose) ||
					(event === "change" && onChange) ||
					(event === "complete" && onComplete) ||
					(event === "error" && onError)
				)
			) {
				return;
			}

			send(`custom:videoStories:${internalId}:${event}`, () => ({
				ui: { values: { [internalId]: value as string } },
			}));
		},
		[send, internalId, onOpen, onClose, onChange, onComplete, onError],
	);
}
