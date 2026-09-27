"use client";
import {
	useCallback,
	useEffect,
	useRef,
	useState,
} from "@tiendanube/nube-sdk-react-runtime";
import type { CSSProperties, ReactNode } from "react";
import { useLayoutEffect } from "react";
import { classNames } from "../../helpers/class-names";
import { toStyle } from "../../helpers/to-style";
import type { BoxProps } from "../../types";

export type SideScrollProps = BoxProps & {
	__internalId: string;
	children: ReactNode;
	step?: number;
	gap?: number;
	hideScrollbar?: boolean;
	width?: number | string;
	style?: CSSProperties;
};

export function SideScroll({
	__internalId,
	children,
	step = 160,
	gap = 4,
	hideScrollbar = false,
	width,
	style,
	...boxProps
}: Readonly<SideScrollProps>) {
	const listRef = useRef<HTMLDivElement>(null);
	const [isAtStart, setIsAtStart] = useState(true);
	const [isAtEnd, setIsAtEnd] = useState(false);

	const checkScrollPosition = useCallback(() => {
		const element = listRef.current;
		if (!element) return;

		const { scrollLeft, scrollWidth, clientWidth } = element;
		const threshold = 1;

		setIsAtStart(scrollLeft <= threshold);
		setIsAtEnd(scrollLeft + clientWidth >= scrollWidth - threshold);
	}, []);

	useEffect(() => {
		const element = listRef.current;
		if (!element) return;

		checkScrollPosition();

		element.addEventListener("scroll", checkScrollPosition);

		const resizeObserver = new ResizeObserver(() => {
			checkScrollPosition();
		});

		resizeObserver.observe(element);

		return () => {
			element.removeEventListener("scroll", checkScrollPosition);
			resizeObserver.disconnect();
		};
	}, [checkScrollPosition]);

	useLayoutEffect(() => {
		checkScrollPosition();
	});

	const scroll = (dx: number) => {
		listRef.current?.scrollBy({ left: dx, behavior: "smooth" });
	};

	const customStyle = toStyle(boxProps);
	const containerClassName = classNames("nube-side-scroll");
	const contentClassName = classNames(
		"nube-side-scroll-content",
		hideScrollbar && "nube-side-scroll-content-no-scrollbar",
	);
	const leftButtonClassName = classNames(
		"nube-side-scroll-nav",
		isAtStart && "nube-side-scroll-nav-hidden",
	);
	const rightButtonClassName = classNames(
		"nube-side-scroll-nav",
		isAtEnd && "nube-side-scroll-nav-hidden",
	);

	return (
		<div
			className={containerClassName}
			id={__internalId}
			style={{
				...customStyle,
				...style,
				display: "grid",
				gridTemplateColumns: "auto 1fr auto",
				alignItems: "center",
				gap,
				...(width !== undefined && { width }),
			}}
		>
			<button
				type="button"
				className={leftButtonClassName}
				onClick={() => scroll(-step)}
				aria-label="Scroll left"
				tabIndex={isAtStart ? -1 : 0}
			>
				‹
			</button>
			<div
				ref={listRef}
				className={contentClassName}
				style={{
					display: "flex",
					gap,
					overflowX: "auto",
					scrollBehavior: "smooth",
					padding: "0 4px",
					...(hideScrollbar && {
						scrollbarWidth: "none",
						msOverflowStyle: "none",
					}),
				}}
			>
				{children}
			</div>
			<button
				type="button"
				className={rightButtonClassName}
				onClick={() => scroll(step)}
				aria-label="Scroll right"
				tabIndex={isAtEnd ? -1 : 0}
			>
				›
			</button>
		</div>
	);
}

SideScroll.displayName = "SideScroll";
