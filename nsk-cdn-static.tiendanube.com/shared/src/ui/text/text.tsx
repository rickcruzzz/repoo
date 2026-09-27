import type { TxtModifier } from "@tiendanube/nube-sdk-types";
import { CopyButton } from "../clipboard/copy-button";
import { isClipboardSupported } from "../clipboard/is-supported";

export type TextProps = {
	color?: string;
	background?: string;
	heading?: 1 | 2 | 3 | 4 | 5 | 6;
	modifiers?: TxtModifier[];
	inline?: boolean;
	children: string;
	__internalId: string;
	showCopyButton?: boolean;
	style?: React.CSSProperties;
};

export function Text(props: Readonly<TextProps>) {
	const {
		color,
		background,
		heading,
		modifiers = [],
		inline,
		children,
		style = {},
		__internalId,
		showCopyButton,
	} = props;

	const customStyle: React.CSSProperties = {
		color,
		backgroundColor: background,
		fontWeight: modifiers.includes("bold") ? "bold" : undefined,
		fontStyle: modifiers.includes("italic") ? "italic" : undefined,
	};

	if (modifiers.includes("underline") && modifiers.includes("strike")) {
		style.textDecoration = "underline line-through";
	} else if (modifiers.includes("underline")) {
		style.textDecoration = "underline";
	} else if (modifiers.includes("strike")) {
		style.textDecoration = "line-through";
	}

	if (modifiers.includes("uppercase")) {
		style.textTransform = "uppercase";
	} else if (modifiers.includes("lowercase")) {
		style.textTransform = "lowercase";
	} else if (modifiers.includes("capitalize")) {
		style.textTransform = "capitalize";
	}

	const Tag = (
		inline ? "span" : !heading ? "p" : `h${heading}`
	) as keyof JSX.IntrinsicElements;

	const textElement = (
		<Tag
			className="nube-text"
			id={__internalId}
			style={{
				...customStyle,
				...style,
			}}
		>
			{children}
		</Tag>
	);

	if (!showCopyButton || !isClipboardSupported()) {
		return textElement;
	}

	const Wrapper = inline ? "span" : "div";

	return (
		<Wrapper
			className="nube-text-copyable"
			style={{
				display: inline ? "inline-flex" : "flex",
				alignItems: "center",
				gap: "4px",
			}}
		>
			{textElement}
			<CopyButton __internalId={__internalId} value={children} />
		</Wrapper>
	);
}
