import type { ReactNode } from "react";
import { IconClose, IconExpand } from "./icons";

export type StoriesFrameProps = {
	open: boolean;
	playerNode: ReactNode;
	progressNode: ReactNode;
	tapToNavigate: boolean;
	onPointerDown: () => void;
	onPointerUp: () => void;
	onNavPrev: () => void;
	onNavNext: () => void;
	onClose: () => void;
	onExpand: () => void;
	children?: ReactNode;
};

export function StoriesFrame({
	open,
	playerNode,
	progressNode,
	tapToNavigate,
	onPointerDown,
	onPointerUp,
	onNavPrev,
	onNavNext,
	onClose,
	onExpand,
	children,
}: StoriesFrameProps) {
	return (
		<div
			className={`nube-stories-frame ${
				open ? "nube-stories-frame--fullscreen" : "nube-stories-frame--docked"
			}`}
			onPointerDown={onPointerDown}
			onPointerUp={onPointerUp}
			onPointerLeave={onPointerUp}
			onPointerCancel={onPointerUp}
		>
			{playerNode}
			{progressNode}
			{tapToNavigate && (
				<>
					<button
						type="button"
						aria-label="Previous"
						onClick={onNavPrev}
						className="nube-stories-tap nube-stories-tap--prev"
					/>
					<button
						type="button"
						aria-label="Next"
						onClick={onNavNext}
						className="nube-stories-tap nube-stories-tap--next"
					/>
				</>
			)}
			{open ? (
				<button
					type="button"
					aria-label="Close stories"
					onClick={onClose}
					onPointerDown={(e) => e.stopPropagation()}
					className="nube-stories-btn nube-stories-close"
				>
					<IconClose />
				</button>
			) : (
				// Inline: tapping the video does NOT open the lightbox — only this
				// button does. Side taps navigate; a press-and-hold pauses.
				<button
					type="button"
					aria-label="Open stories"
					onClick={onExpand}
					onPointerDown={(e) => e.stopPropagation()}
					className="nube-stories-btn nube-stories-expand"
				>
					<IconExpand />
				</button>
			)}
			{children && <div className="nube-stories-overlay">{children}</div>}
		</div>
	);
}
