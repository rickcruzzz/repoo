"use client";

import type { NubeSDKRuntimeStateModifier } from "@tiendanube/nube-sdk-internal-types";
import {
	useCallback,
	useEffect,
	useRef,
} from "@tiendanube/nube-sdk-react-runtime";
import type { NubeComponent, NubeSDKState } from "@tiendanube/nube-sdk-types";
import { useNubeSDK } from "../../hooks/use-nube-sdk";
import { Slot } from "../slot";

// Constants
const SDK_EVENT = "ui:slot:set";
const MODAL_SLOT_ID = "modal_content";
const DIALOG_ID = "nube-modal";

// Types
interface StateWithApps extends NubeSDKState {
	apps?: Record<string, unknown>;
}

interface ClickEvent extends MouseEvent {
	clientX: number;
	clientY: number;
}

export type ModalContentProps = {
	hostId: string;
};

const clearModalState = (state: NubeSDKState): NubeSDKState => ({
	...state,
	ui: {
		...(state.ui ?? {}),
		slots: {
			...(state.ui?.slots ?? {}),
			[MODAL_SLOT_ID]: undefined,
		},
	},
});

const clearAppsModalState = (
	state: NubeSDKState,
): NubeSDKState & { apps?: Record<string, unknown> } => {
	const stateWithApps = state as StateWithApps;

	const clearedApps = stateWithApps.apps
		? Object.keys(stateWithApps.apps).reduce(
				(current, appid) => {
					current[appid] = clearModalState(
						stateWithApps?.apps?.[appid] as NubeSDKState,
					);
					return current;
				},
				{} as Record<string, unknown>,
			)
		: {};

	return {
		...clearModalState(state),
		...(stateWithApps.apps && { apps: clearedApps }),
	};
};

export function ModalContent({ hostId }: ModalContentProps) {
	const { state, send } = useNubeSDK(hostId, SDK_EVENT);
	const dialogRef = useRef<HTMLDialogElement>(null);
	const component: NubeComponent | undefined = state?.ui?.slots?.[
		MODAL_SLOT_ID
	] as NubeComponent;

	const handleOutsideClick = useCallback((event: ClickEvent) => {
		if (!dialogRef.current) return;
		const dialog = dialogRef.current;

		try {
			const rect = dialog.getBoundingClientRect();
			const isInDialog =
				rect.top <= event.clientY &&
				event.clientY <= rect.top + rect.height &&
				rect.left <= event.clientX &&
				event.clientX <= rect.left + rect.width;

			if (!isInDialog) {
				dialog.close();
			}
		} catch (error) {
			// eslint-disable-next-line no-console
			console.error("Error handling outside click:", error);
		}
	}, []);

	const handleClose = useCallback(() => {
		try {
			if (window.nubeSDK?.send) {
				window.nubeSDK.send(
					hostId,
					SDK_EVENT,
					clearAppsModalState as NubeSDKRuntimeStateModifier,
				);
			} else {
				// eslint-disable-next-line no-console
				console.warn("nubeSDK not available");
			}
		} catch (error) {
			// eslint-disable-next-line no-console
			console.error("Error sending nubeSDK message:", error);
		} finally {
			send("custom:modal:close");
		}
	}, [hostId, send]);

	useEffect(() => {
		const dialog = dialogRef.current;
		if (!dialog) return undefined;

		dialog.addEventListener("click", handleOutsideClick);

		return () => {
			dialog?.removeEventListener("click", handleOutsideClick);
		};
	}, [handleOutsideClick]);

	useEffect(() => {
		const dialog = dialogRef.current;
		if (!dialog) return;

		try {
			if (component) {
				dialog.showModal();
			} else {
				dialog.close();
			}
		} catch (error) {
			// eslint-disable-next-line no-console
			console.error("Error managing dialog state:", error);
		}
	}, [component]);

	return (
		<dialog onClose={handleClose} ref={dialogRef} id={DIALOG_ID}>
			<Slot id={MODAL_SLOT_ID} />
		</dialog>
	);
}
