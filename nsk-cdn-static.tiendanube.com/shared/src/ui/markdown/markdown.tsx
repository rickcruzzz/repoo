"use client";

import { Fragment, useMemo } from "@tiendanube/nube-sdk-react-runtime";
import { Link } from "../link/link";

export type MarkdownProps = {
	content: string;
	__internalId?: string;
};

// Utility function to escape HTML special characters and prevent XSS
function escapeHtml(text: string): string {
	const map: Record<string, string> = {
		"&": "&amp;",
		"<": "&lt;",
		">": "&gt;",
		'"': "&quot;",
		"'": "&#039;",
	};
	return text.replace(/[&<>"']/g, (char) => map[char] || char);
}

// Validate URL to prevent SSRF attacks
function isValidUrl(url: string): boolean {
	try {
		const parsed = new URL(url);
		// Only allow http and https protocols
		return parsed.protocol === "http:" || parsed.protocol === "https:";
	} catch {
		return false;
	}
}

// Parse inline code (backticks) - simple inline code only
function parseInlineCode(text: string): (string | JSX.Element)[] {
	const parts: (string | JSX.Element)[] = [];
	let lastIndex = 0;
	let key = 0;

	// Match inline code with backticks
	const codeRegex = /`([^`]+)`/g;
	let match = codeRegex.exec(text);

	while (match !== null) {
		// Add text before the match
		if (match.index > lastIndex) {
			parts.push(text.slice(lastIndex, match.index));
		}

		// Add the code element - escape HTML to prevent XSS
		const codeContent = match[1];
		if (codeContent) {
			parts.push(<code key={`code-${key++}`}>{escapeHtml(codeContent)}</code>);
		}

		lastIndex = match.index + match[0].length;
		match = codeRegex.exec(text);
	}

	// Add remaining text
	if (lastIndex < text.length) {
		parts.push(text.slice(lastIndex));
	}

	return parts.length > 0 ? parts : [text];
}

// Parse bold and italic text
// Bold: **text**
// Italic: *text*
// Bold and Italic: ***text***
function parseBoldItalic(text: string): (string | JSX.Element)[] {
	const parts: (string | JSX.Element)[] = [];
	let lastIndex = 0;
	let key = 0;

	// Match bold+italic (***text***), bold (**text**), and italic (*text*)
	// Priority: bold+italic > bold > italic
	const regex = /(\*\*\*([^*]+)\*\*\*|\*\*([^*]+)\*\*|\*([^*]+)\*)/g;
	let match = regex.exec(text);

	while (match !== null) {
		// Add text before the match
		if (match.index > lastIndex) {
			const beforeText = text.slice(lastIndex, match.index);
			parts.push(...parseInlineCode(beforeText));
		}

		// Determine if it's bold+italic, bold, or italic
		const fullMatch = match[1];
		if (fullMatch?.startsWith("***")) {
			// Bold and Italic: ***text***
			const boldItalicText = match[2] || "";
			parts.push(
				<strong key={`bold-italic-${key++}`}>
					<em>{boldItalicText}</em>
				</strong>,
			);
		} else if (fullMatch?.startsWith("**")) {
			// Bold: **text**
			const boldText = match[3] || "";
			parts.push(<strong key={`bold-${key++}`}>{boldText}</strong>);
		} else {
			// Italic: *text*
			const italicText = match[4] || "";
			parts.push(<em key={`italic-${key++}`}>{italicText}</em>);
		}

		lastIndex = match.index + match[0].length;
		match = regex.exec(text);
	}

	// Add remaining text
	if (lastIndex < text.length) {
		const remainingText = text.slice(lastIndex);
		parts.push(...parseInlineCode(remainingText));
	}

	return parts.length > 0 ? parts : parseInlineCode(text);
}

// Parse images ![alt](url)
function parseImages(text: string): (string | JSX.Element)[] {
	const parts: (string | JSX.Element)[] = [];
	let lastIndex = 0;
	let key = 0;

	const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
	let match = imageRegex.exec(text);

	while (match !== null) {
		// Add text before the match (with bold/italic/code parsing)
		if (match.index > lastIndex) {
			const beforeText = text.slice(lastIndex, match.index);
			parts.push(...parseBoldItalic(beforeText));
		}

		// Validate URL
		const url = match[2];
		const alt = match[1] || "";

		if (url && isValidUrl(url)) {
			const imageKey = key++;
			parts.push(
				<img
					key={`image-${imageKey}`}
					src={url}
					alt={alt}
					className="nube-image"
					id={`markdown-image-${imageKey}`}
				/>,
			);
		} else {
			// Invalid URL, render as plain text (will be escaped by parseBoldItalic)
			parts.push(...parseBoldItalic(`![${alt}](${url || ""})`));
		}

		lastIndex = match.index + match[0].length;
		match = imageRegex.exec(text);
	}

	// Add remaining text
	if (lastIndex < text.length) {
		const remainingText = text.slice(lastIndex);
		parts.push(...parseBoldItalic(remainingText));
	}

	return parts.length > 0 ? parts : parseBoldItalic(text);
}

// Parse links [text](url) - but not images ![alt](url)
function parseLinks(text: string): (string | JSX.Element)[] {
	const parts: (string | JSX.Element)[] = [];
	let lastIndex = 0;
	let key = 0;

	const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
	let match = linkRegex.exec(text);

	while (match !== null) {
		// Check if this is actually an image (has ! before [)
		const charBefore = match.index > 0 ? text[match.index - 1] : null;
		if (charBefore === "!") {
			// This is an image, skip it (images are parsed separately)
			lastIndex = match.index + match[0].length;
			match = linkRegex.exec(text);
			continue;
		}

		// Add text before the match (with bold/italic/code parsing)
		if (match.index > lastIndex) {
			const beforeText = text.slice(lastIndex, match.index);
			parts.push(...parseBoldItalic(beforeText));
		}

		// Validate URL
		const url = match[2];
		const linkText = match[1] || "";

		if (url && isValidUrl(url)) {
			// Link text is parsed for markdown formatting
			const parsedLinkText = parseBoldItalic(linkText);
			const linkKey = key++;
			parts.push(
				<Link
					key={`link-${linkKey}`}
					href={url}
					target="_blank"
					rel="noopener noreferrer"
					__internalId={`markdown-link-${linkKey}`}
				>
					{parsedLinkText}
				</Link>,
			);
		} else {
			// Invalid URL, render as plain text (will be escaped by parseBoldItalic)
			parts.push(...parseBoldItalic(`[${linkText}](${url || ""})`));
		}

		lastIndex = match.index + match[0].length;
		match = linkRegex.exec(text);
	}

	// Add remaining text
	if (lastIndex < text.length) {
		const remainingText = text.slice(lastIndex);
		parts.push(...parseBoldItalic(remainingText));
	}

	return parts.length > 0 ? parts : parseBoldItalic(text);
}

// Parse line breaks (<br> and <br />)
function parseLineBreaks(text: string): (string | JSX.Element)[] {
	const parts: (string | JSX.Element)[] = [];
	let lastIndex = 0;
	let key = 0;

	// Match <br> or <br /> (case insensitive)
	const brRegex = /<br\s*\/?>/gi;
	let match = brRegex.exec(text);

	while (match !== null) {
		// Add text before the match
		if (match.index > lastIndex) {
			parts.push(text.slice(lastIndex, match.index));
		}

		// Add the br element
		parts.push(<br key={`br-${key++}`} />);

		lastIndex = match.index + match[0].length;
		match = brRegex.exec(text);
	}

	// Add remaining text
	if (lastIndex < text.length) {
		parts.push(text.slice(lastIndex));
	}

	return parts.length > 0 ? parts : [text];
}

// Parse a single line of text (handles inline elements)
// Process images first, then process the result for links, then line breaks
function parseInlineElements(text: string): (string | JSX.Element)[] {
	// First parse images (they have ! prefix)
	const imageParts = parseImages(text);

	// Convert the array to process links in text parts
	const processedParts: (string | JSX.Element)[] = [];

	for (const part of imageParts) {
		if (typeof part === "string") {
			// Process links in text parts
			const linkParts = parseLinks(part);
			// Process line breaks in text parts
			for (const linkPart of linkParts) {
				if (typeof linkPart === "string") {
					processedParts.push(...parseLineBreaks(linkPart));
				} else {
					processedParts.push(linkPart);
				}
			}
		} else {
			// Keep image elements as-is
			processedParts.push(part);
		}
	}

	return processedParts.length > 0 ? processedParts : parseBoldItalic(text);
}

// Parse headers (# Header)
function parseHeader(line: string): JSX.Element | null {
	const headerMatch = line.match(/^(#{1,6})\s+(.+)$/);
	if (!headerMatch || !headerMatch[1] || !headerMatch[2]) return null;

	const level = headerMatch[1].length;
	const content = headerMatch[2];
	const HeaderTag = `h${level}` as keyof JSX.IntrinsicElements;

	return (
		<HeaderTag key={`header-${line}`} className="nube-text">
			{parseInlineElements(content)}
		</HeaderTag>
	);
}

// Parse list items
function parseListItem(line: string): {
	isOrdered: boolean;
	content: string;
} | null {
	// Ordered list: 1. item
	const orderedMatch = line.match(/^\d+\.\s+(.+)$/);
	if (orderedMatch?.[1]) {
		return {
			isOrdered: true,
			content: orderedMatch[1],
		};
	}

	// Unordered list: - item or * item
	const unorderedMatch = line.match(/^[-*]\s+(.+)$/);
	if (unorderedMatch?.[1]) {
		return {
			isOrdered: false,
			content: unorderedMatch[1],
		};
	}

	return null;
}

// Helper function to close a list
function closeList(
	listItems: { isOrdered: boolean; content: string }[],
	listKey: number,
): { element: JSX.Element; newKey: number } | null {
	if (listItems.length === 0) return null;

	const firstItem = listItems[0];
	if (!firstItem) return null;

	const isOrdered = firstItem.isOrdered;
	const ListTag = isOrdered ? "ol" : "ul";
	return {
		element: (
			<ListTag key={`list-${listKey}`}>
				{listItems.map((item) => (
					<li key={`list-item-${listKey}-${item.content}`}>
						{parseInlineElements(item.content)}
					</li>
				))}
			</ListTag>
		),
		newKey: listKey + 1,
	};
}

// Main parser function - simplified, no code blocks, no HTML
function parseMarkdown(content: string): JSX.Element[] {
	// Preserve <br> and <br /> tags before sanitization
	// Use a unique marker that won't appear in normal text
	const BR_MARKER = "\uE000BR_MARKER\uE001";
	const preservedContent = content.replace(/<br\s*\/?>/gi, BR_MARKER);

	// Strip any HTML tags and scripts for security
	const sanitizedContent = preservedContent
		.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
		.replace(/<[^>]+>/g, "")
		// Restore br markers
		.replace(new RegExp(BR_MARKER, "g"), "<br />");

	const trimmedContent = sanitizedContent.trim();
	if (!trimmedContent) {
		return [];
	}

	const lines = sanitizedContent.split("\n");
	const elements: JSX.Element[] = [];
	let i = 0;
	let listItems: { isOrdered: boolean; content: string }[] = [];
	let listKey = 0;
	let paragraphLines: string[] = [];
	let paragraphKey = 0;

	while (i < lines.length) {
		const line = lines[i];
		if (line === undefined) break;
		const trimmedLine = line.trim();

		// Empty line - separates paragraphs and closes lists
		if (trimmedLine === "") {
			// Close any open list
			if (listItems.length > 0) {
				const closed = closeList(listItems, listKey);
				if (closed) {
					elements.push(closed.element);
					listKey = closed.newKey;
				}
				listItems = [];
			}

			// Close any open paragraph
			if (paragraphLines.length > 0) {
				const paragraphText = paragraphLines.join(" ");
				elements.push(
					<p key={`paragraph-${paragraphKey++}`} className="nube-text">
						{parseInlineElements(paragraphText)}
					</p>,
				);
				paragraphLines = [];
			}

			i++;
			continue;
		}

		// Try to parse header
		const header = parseHeader(line);
		if (header) {
			// Close any open list before header
			if (listItems.length > 0) {
				const closed = closeList(listItems, listKey);
				if (closed) {
					elements.push(closed.element);
					listKey = closed.newKey;
				}
				listItems = [];
			}

			// Close any open paragraph before header
			if (paragraphLines.length > 0) {
				const paragraphText = paragraphLines.join(" ");
				elements.push(
					<p key={`paragraph-${paragraphKey++}`} className="nube-text">
						{parseInlineElements(paragraphText)}
					</p>,
				);
				paragraphLines = [];
			}

			elements.push(header);
			i++;
			continue;
		}

		// Try to parse list item
		const listItem = parseListItem(line);
		if (listItem) {
			// Close any open paragraph before list
			if (paragraphLines.length > 0) {
				const paragraphText = paragraphLines.join(" ");
				elements.push(
					<p key={`paragraph-${paragraphKey++}`} className="nube-text">
						{parseInlineElements(paragraphText)}
					</p>,
				);
				paragraphLines = [];
			}

			listItems.push(listItem);
			i++;
			continue;
		}

		// Regular paragraph line
		paragraphLines.push(line);
		i++;
	}

	// Close any remaining open list
	if (listItems.length > 0) {
		const closed = closeList(listItems, listKey);
		if (closed) {
			elements.push(closed.element);
		}
	}

	// Close any remaining open paragraph
	if (paragraphLines.length > 0) {
		const paragraphText = paragraphLines.join(" ");
		elements.push(
			<p key={`paragraph-${paragraphKey++}`} className="nube-text">
				{parseInlineElements(paragraphText)}
			</p>,
		);
	}

	return elements;
}

export function Markdown({ content, __internalId }: Readonly<MarkdownProps>) {
	const elements = useMemo(() => parseMarkdown(content), [content]);

	return <Fragment key={__internalId}>{elements}</Fragment>;
}
