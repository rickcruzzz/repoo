"use client";

import type { NubeSDKRuntimeStateModifier } from "@tiendanube/nube-sdk-internal-types";
import {
	useCallback,
	useEffect,
	useRef,
} from "@tiendanube/nube-sdk-react-runtime";
import type { NubeSDKState, UISlot } from "@tiendanube/nube-sdk-types";
import { useNubeSDK } from "../../hooks/use-nube-sdk";
import { Slot } from "../slot";

// Constants
const SDK_EVENT = "ui:slot:set";
const ANIMATION_DURATION_MS = 300;

// Types
interface StateWithApps extends NubeSDKState {
	apps?: Record<string, unknown>;
}

interface ClickEvent extends MouseEvent {
	clientX: number;
	clientY: number;
}

export type DrawerSlotId = "drawer_left" | "drawer_right";

export type DrawerContentProps = {
	hostId: string;
	slotId: DrawerSlotId;
};

function clearDrawerState(
	state: NubeSDKState,
	slotId: DrawerSlotId,
): NubeSDKState {
	return {
		...state,
		ui: {
			...(state.ui ?? {}),
			slots: {
				...(state.ui?.slots ?? {}),
				[slotId]: undefined,
			},
		},
	};
}

function clearAppsDrawerState(
	state: NubeSDKState,
	slotId: DrawerSlotId,
): NubeSDKState & { apps?: Record<string, unknown> } {
	const stateWithApps = state as StateWithApps;

	const clearedApps = stateWithApps.apps
		? Object.keys(stateWithApps.apps).reduce(
				(current, appid) => {
					current[appid] = clearDrawerState(
						stateWithApps?.apps?.[appid] as NubeSDKState,
						slotId,
					);
					return current;
				},
				{} as Record<string, unknown>,
			)
		: {};

	return {
		...clearDrawerState(state, slotId),
		...(stateWithApps.apps && { apps: clearedApps }),
	};
}

function getDrawerDialogId(slotId: DrawerSlotId): string {
	return slotId === "drawer_left" ? "nube-drawer-left" : "nube-drawer-right";
}

export function DrawerContent({ hostId, slotId }: DrawerContentProps) {
	const { state, send } = useNubeSDK(hostId, SDK_EVENT);
	const dialogRef = useRef<HTMLDialogElement>(null);
	const panelRef = useRef<HTMLDivElement>(null);
	const isClosingRef = useRef(false);

	const slotContent = state?.ui?.slots?.[slotId as UISlot];
	const hasContent = Boolean(slotContent);

	const side = slotId === "drawer_left" ? "left" : "right";
	const dialogId = getDrawerDialogId(slotId);

	const handleClose = useCallback(() => {
		try {
			if (window.nubeSDK?.send) {
				window.nubeSDK.send(hostId, SDK_EVENT, ((state: NubeSDKState) =>
					clearAppsDrawerState(state, slotId)) as NubeSDKRuntimeStateModifier);
			} else {
				// eslint-disable-next-line no-console
				console.warn("nubeSDK not available");
			}
		} catch (error) {
			// eslint-disable-next-line no-console
			console.error("Error sending nubeSDK message:", error);
		} finally {
			send("custom:drawer:close");
		}
	}, [hostId, slotId, send]);

	const requestClose = useCallback(() => {
		if (isClosingRef.current) return;
		const dialog = dialogRef.current;
		if (!dialog) return;
		isClosingRef.current = true;
		dialog.classList.add("nube-drawer-dialog--closing");
		setTimeout(() => {
			dialog.close();
			handleClose();
			dialog.classList.remove("nube-drawer-dialog--closing");
			isClosingRef.current = false;
		}, ANIMATION_DURATION_MS);
	}, [handleClose]);

	const handleDialogClose = useCallback(() => {
		if (!isClosingRef.current) {
			handleClose();
		}
	}, [handleClose]);

	// Fechar por clique no backdrop: usa Element.getBoundingClientRect() para
	// saber se o clique (clientX, clientY) está fora do painel (= no backdrop).
	const handleOutsideClick = useCallback(
		(event: ClickEvent) => {
			const panel = panelRef.current;
			if (!panel || !dialogRef.current) return;

			try {
				const rect = panel.getBoundingClientRect();
				const isInPanel =
					rect.top <= event.clientY &&
					event.clientY <= rect.top + rect.height &&
					rect.left <= event.clientX &&
					event.clientX <= rect.left + rect.width;

				if (!isInPanel) {
					requestClose();
				}
			} catch (error) {
				// eslint-disable-next-line no-console
				console.error("Error handling outside click:", error);
			}
		},
		[requestClose],
	);

	const handleKeyDown = useCallback(
		(event: KeyboardEvent) => {
			if (event.key === "Escape") {
				event.preventDefault();
				requestClose();
			}
		},
		[requestClose],
	);

	useEffect(() => {
		const dialog = dialogRef.current;
		if (!dialog) return undefined;

		dialog.addEventListener("click", handleOutsideClick as EventListener);
		dialog.addEventListener("keydown", handleKeyDown);

		return () => {
			dialog.removeEventListener("click", handleOutsideClick as EventListener);
			dialog.removeEventListener("keydown", handleKeyDown);
		};
	}, [handleOutsideClick, handleKeyDown]);

	useEffect(() => {
		const dialog = dialogRef.current;
		if (!dialog) return;

		try {
			if (hasContent) {
				dialog.classList.add("nube-drawer-dialog--opening");
				dialog.showModal();
				// Use double requestAnimationFrame to ensure backdrop is created
				// before removing the opening class
				requestAnimationFrame(() => {
					requestAnimationFrame(() => {
						dialog.classList.remove("nube-drawer-dialog--opening");
					});
				});
			} else {
				dialog.close();
			}
		} catch (error) {
			// eslint-disable-next-line no-console
			console.error("Error managing dialog state:", error);
		}
	}, [slotContent]);

	return (
		<dialog
			ref={dialogRef}
			onClose={handleDialogClose}
			id={dialogId}
			className={`nube-drawer-dialog nube-drawer-dialog--${side}`}
			aria-label={`Drawer ${side}`}
		>
			<div
				ref={panelRef}
				className={`nube-drawer-panel nube-drawer-panel--${side}`}
			>
				<Slot id={slotId as UISlot} />
			</div>
		</dialog>
	);
}
