"use client";

import type { NubeSDKRuntimeStateModifier } from "@tiendanube/nube-sdk-internal-types";
import {
	useCallback,
	useEffect,
	useRef,
} from "@tiendanube/nube-sdk-react-runtime";
import type {
	NubeComponent,
	NubeSDKState,
	UISlot,
} from "@tiendanube/nube-sdk-types";
import { useNubeSDK } from "../../hooks/use-nube-sdk";
import { FullscreenModeContext } from "../../ui/video/video-context";
import { Slot } from "../slot";

// Constants
const SDK_EVENT = "ui:slot:set";
// TODO: remove type casting from this file once types are public in `@tiendanube/nube-sdk-types`
const FULLSCREEN_SLOT_ID = "fullscreen_content" as UISlot;
const DIALOG_ID = "nube-fullscreen";

// We only allow certain component types to render fullscreen
const ADMITTED_TYPES = new Set(["videoRoot"]);

// Types
interface StateWithApps extends NubeSDKState {
	apps?: Record<string, unknown>;
}

export type FullscreenContentProps = {
	hostId: string;
};

const clearFullscreenState = (state: NubeSDKState): NubeSDKState => ({
	...state,
	ui: {
		...(state.ui ?? {}),
		slots: {
			...(state.ui?.slots ?? {}),
			[FULLSCREEN_SLOT_ID]: undefined,
		},
	},
});

const clearAppsFullscreenState = (
	state: NubeSDKState,
): NubeSDKState & { apps?: Record<string, unknown> } => {
	const stateWithApps = state as StateWithApps;

	const clearedApps = stateWithApps.apps
		? Object.keys(stateWithApps.apps).reduce(
				(current, appid) => {
					current[appid] = clearFullscreenState(
						stateWithApps?.apps?.[appid] as NubeSDKState,
					);
					return current;
				},
				{} as Record<string, unknown>,
			)
		: {};

	return {
		...clearFullscreenState(state),
		...(stateWithApps.apps && { apps: clearedApps }),
	};
};

export function FullscreenContent({ hostId }: FullscreenContentProps) {
	const { state } = useNubeSDK(hostId, SDK_EVENT);
	const dialogRef = useRef<HTMLDialogElement>(null);
	const component: NubeComponent | undefined = state?.ui?.slots?.[
		FULLSCREEN_SLOT_ID
	] as NubeComponent;

	const admitted =
		!!component &&
		typeof component === "object" &&
		ADMITTED_TYPES.has((component as { type?: string }).type ?? "");

	const handleClose = useCallback(() => {
		const comp = component as
			| { type?: string; __internalId?: string }
			| undefined;

		try {
			if (comp?.type && comp.__internalId && window.nubeSDK?.send) {
				const internalId = comp.__internalId;
				window.nubeSDK.send(
					hostId,
					`custom:${comp.type}:${internalId}:close`,
					(() => ({
						ui: { values: { [internalId]: {} as unknown as string } },
					})) as NubeSDKRuntimeStateModifier,
				);
			}
		} catch (error) {
			// eslint-disable-next-line no-console
			console.error("Error emitting fullscreen close:", error);
		}

		try {
			if (window.nubeSDK?.send) {
				window.nubeSDK.send(
					hostId,
					SDK_EVENT,
					clearAppsFullscreenState as NubeSDKRuntimeStateModifier,
				);
			}
		} catch (error) {
			// eslint-disable-next-line no-console
			console.error("Error clearing fullscreen slot:", error);
		}
	}, [hostId, component]);

	useEffect(() => {
		const dialog = dialogRef.current;
		if (!dialog) return;

		try {
			if (admitted) {
				if (!dialog.open) dialog.showModal();
			} else {
				const wasOpen = dialog.open;
				if (wasOpen) dialog.close();

				// A non-admitted component was assigned — surface it and clear it.
				if (component && !admitted) {
					// eslint-disable-next-line no-console
					console.warn(
						`[nube-sdk] fullscreen_content only admits ${[...ADMITTED_TYPES].join(", ")}; ignoring "${(component as { type?: string }).type}".`,
					);
					if (!wasOpen) handleClose();
				}
			}
		} catch (error) {
			// eslint-disable-next-line no-console
			console.error("Error managing fullscreen dialog state:", error);
		}
	}, [admitted, component, handleClose]);

	return (
		<dialog onClose={handleClose} ref={dialogRef} id={DIALOG_ID}>
			{admitted && (
				<>
					{/* Marks descendants as fullscreen so the video adapts by placement,
					    with no app-facing prop. */}
					<FullscreenModeContext.Provider value={true}>
						<Slot id={FULLSCREEN_SLOT_ID} />
					</FullscreenModeContext.Provider>
					<button
						type="button"
						aria-label="Close video"
						className="nube-fullscreen-close"
						onClick={() => dialogRef.current?.close()}
					>
						<svg
							width="20"
							height="20"
							viewBox="0 0 24 24"
							fill="none"
							aria-hidden="true"
						>
							<path
								d="M6 6 18 18M18 6 6 18"
								stroke="currentColor"
								strokeWidth="2"
								strokeLinecap="round"
								strokeLinejoin="round"
							/>
						</svg>
					</button>
				</>
			)}
		</dialog>
	);
}
