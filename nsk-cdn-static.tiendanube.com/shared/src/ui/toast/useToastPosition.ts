import { useEffect, useState } from "@tiendanube/nube-sdk-react-runtime";
import type { RefObject } from "react";

const SCREEN_DIVISION_FACTOR = 2;

type ToastPosition = "top" | "bottom";

export const useToastPosition = (
	toastRef: RefObject<HTMLDivElement>,
): ToastPosition | undefined => {
	const [currentPosition, setCurrentPosition] = useState<ToastPosition>();

	useEffect(() => {
		const calculatePosition = () => {
			if (!toastRef.current) return;

			const { top } = toastRef.current.getBoundingClientRect();
			const windowHeight = window.innerHeight;

			const isTopHalf = top < windowHeight / SCREEN_DIVISION_FACTOR;

			let newPosition: ToastPosition;
			if (isTopHalf) {
				newPosition = "top";
			} else {
				newPosition = "bottom";
			}

			setCurrentPosition(newPosition);
		};

		calculatePosition();

		window.addEventListener("resize", calculatePosition);
		return () => window.removeEventListener("resize", calculatePosition);
	}, [toastRef]);

	return currentPosition;
};
