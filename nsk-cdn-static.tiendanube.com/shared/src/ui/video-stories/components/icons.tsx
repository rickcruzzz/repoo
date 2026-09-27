export const SVG_BASE = {
	width: 20,
	height: 20,
	viewBox: "0 0 24 24",
	fill: "none",
	"aria-hidden": true,
} as const;

export const SVG_STROKE = {
	stroke: "currentColor",
	strokeWidth: 2,
	strokeLinecap: "round",
	strokeLinejoin: "round",
} as const;

export const IconUnmuted = () => (
	<svg {...SVG_BASE}>
		<title>Unmuted</title>
		<path d="M11 5 6 9H2v6h4l5 4V5Z" fill="currentColor" />
		<path d="M16 8.5a4 4 0 0 1 0 7" {...SVG_STROKE} />
		<path d="M19 5.5a8 8 0 0 1 0 13" {...SVG_STROKE} />
	</svg>
);

export const IconMuted = () => (
	<svg {...SVG_BASE}>
		<title>Muted</title>
		<path d="M11 5 6 9H2v6h4l5 4V5Z" fill="currentColor" />
		<path d="M17 9.5 22 14.5M22 9.5 17 14.5" {...SVG_STROKE} />
	</svg>
);

export const IconClose = () => (
	<svg {...SVG_BASE}>
		<title>Close</title>
		<path d="M6 6 18 18M18 6 6 18" {...SVG_STROKE} />
	</svg>
);

export const IconExpand = () => (
	<svg {...SVG_BASE}>
		<title>Expand</title>
		<path
			d="M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M8 21H5a2 2 0 0 1-2-2v-3M16 21h3a2 2 0 0 0 2-2v-3"
			{...SVG_STROKE}
		/>
	</svg>
);
