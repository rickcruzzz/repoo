"use client";

import { Slot } from "../slot";

export type CornerProps = Readonly<{
	top?: boolean;
	bottom?: boolean;
	left?: boolean;
	right?: boolean;
	children: React.ReactNode;
}>;

const baseStyle: React.CSSProperties = {
	position: "fixed",
	zIndex: 9998, // one to #nube-modal (9999)
	maxWidth: "45vw",
};

export function Corner({ top, bottom, left, right, children }: CornerProps) {
	const style: React.CSSProperties = {
		...baseStyle,
		...(top ? { top: 0 } : {}),
		...(bottom ? { bottom: 0 } : {}),
		...(left ? { left: 0 } : {}),
		...(right ? { right: 0 } : {}),
	};

	return <div style={style}>{children}</div>;
}

export function FloatingCorners() {
	return (
		<>
			<Corner top left>
				<Slot id="corner_top_left" />
			</Corner>
			<Corner top right>
				<Slot id="corner_top_right" />
			</Corner>
			<Corner bottom left>
				<Slot id="corner_bottom_left" />
			</Corner>
			<Corner bottom right>
				<Slot id="corner_bottom_right" />
			</Corner>
		</>
	);
}
