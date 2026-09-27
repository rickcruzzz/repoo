import type { Size } from "@tiendanube/nube-sdk-types";
import type { CSSProperties } from "react";

export type ImageSource = {
	src: string;
	media?: string;
};

export type ImageProps = {
	src: string;
	alt: string;
	sources?: ImageSource[];
	width?: Size;
	height?: Size;
	style?: CSSProperties;
	__internalId?: string;
};

export function Image(props: Readonly<ImageProps>) {
	const { alt, sources, width, height, style, __internalId } = props;

	if (sources) {
		return (
			<picture className="nube-image" id={__internalId}>
				{sources?.map(({ src, media }) => (
					<source key={src} srcSet={src} media={media} />
				))}
				<img
					src={props.src}
					alt={alt}
					width={width}
					height={height}
					style={style}
				/>
			</picture>
		);
	}

	return (
		<img
			className="nube-image"
			id={__internalId}
			src={props.src}
			alt={props.alt}
			width={width}
			height={height}
			style={style}
		/>
	);
}
