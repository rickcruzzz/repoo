"use client";

import { useEffect } from "@tiendanube/nube-sdk-react-runtime";
import { DrawerContent } from "../drawer-content";
import { FloatingCorners } from "../floating-corner";
import { FloatingEdges } from "../floating-edge";
import { FullscreenContent } from "../fullscreen-content";
import { ModalContent, type ModalContentProps } from "../modal-content";
import { ScrollTracker } from "../scroll-tracker";
import { VisibilityMonitor } from "../visibility-monitor";

export type RuntimeProps = ModalContentProps;

function setThemeClass() {
	const theme = window.nubeSDK?.getState()?.store?.theme;
	if (!theme) return;
	document.body.classList.add(`js-nubesdk-theme-${theme}`);
}

export function Runtime({ hostId }: RuntimeProps) {
	useEffect(() => {
		if (document.readyState === "loading") {
			document.addEventListener("DOMContentLoaded", setThemeClass);
		} else {
			setThemeClass();
		}
	}, []);

	return (
		<>
			<ScrollTracker hostId={hostId} />
			<ModalContent hostId={hostId} />
			<FullscreenContent hostId={hostId} />
			<DrawerContent hostId={hostId} slotId="drawer_left" />
			<DrawerContent hostId={hostId} slotId="drawer_right" />
			<FloatingCorners />
			<FloatingEdges />
			<VisibilityMonitor hostId={hostId} />
		</>
	);
}
