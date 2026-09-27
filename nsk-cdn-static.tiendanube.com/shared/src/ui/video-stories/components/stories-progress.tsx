import type { RefObject } from "react";
import type { VideoStoriesItem } from "../types.local";

export type StoriesProgressProps = {
	items: VideoStoriesItem[];
	index: number;
	activeFillRef: RefObject<HTMLDivElement>;
};

export function StoriesProgress({
	items,
	index,
	activeFillRef,
}: StoriesProgressProps) {
	return (
		<div className="nube-stories-progress">
			{items.map((item, i) => {
				const isActive = i === index;
				const style = isActive
					? undefined
					: { transform: `scaleX(${i < index ? 1 : 0})` };

				return (
					<div key={`${item.src}-${i}`} className="nube-stories-seg">
						<div
							ref={isActive ? activeFillRef : undefined}
							className="nube-stories-seg-fill"
							style={style}
						/>
					</div>
				);
			})}
		</div>
	);
}
