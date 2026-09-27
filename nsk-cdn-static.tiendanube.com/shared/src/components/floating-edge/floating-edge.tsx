"use client";

import { Slot } from "../slot";

export type EdgeProps = Readonly<{
	top?: boolean;
	bottom?: boolean;
	left?: boolean;
	right?: boolean;
	children: React.ReactNode;
}>;

const baseStyle: React.CSSProperties = {
	position: "fixed",
	zIndex: 9997, // one below corners (#9998) and #nube-modal (9999)
};

export function Edge({ top, bottom, left, right, children }: EdgeProps) {
	const style: React.CSSProperties = { ...baseStyle };

	if (top) {
		style.top = 0;
		style.left = "50%";
		style.transform = "translateX(-50%)";
		style.maxWidth = "80vw";
		style.maxHeight = "45vh";
	} else if (bottom) {
		style.bottom = 0;
		style.left = "50%";
		style.transform = "translateX(-50%)";
		style.maxWidth = "80vw";
		style.maxHeight = "45vh";
	} else if (left) {
		style.left = 0;
		style.top = "50%";
		style.transform = "translateY(-50%)";
		style.maxWidth = "45vw";
		style.maxHeight = "80vh";
	} else if (right) {
		style.right = 0;
		style.top = "50%";
		style.transform = "translateY(-50%)";
		style.maxWidth = "45vw";
		style.maxHeight = "80vh";
	}

	return <div style={style}>{children}</div>;
}

export function FloatingEdges() {
	return (
		<>
			<Edge top>
				<Slot id="edge_top_center" />
			</Edge>
			<Edge bottom>
				<Slot id="edge_bottom_center" />
			</Edge>
			<Edge left>
				<Slot id="edge_left_center" />
			</Edge>
			<Edge right>
				<Slot id="edge_right_center" />
			</Edge>
		</>
	);
}
