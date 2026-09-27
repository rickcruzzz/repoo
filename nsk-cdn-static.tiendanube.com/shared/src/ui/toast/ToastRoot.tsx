"use client";
import {
	useCallback,
	useEffect,
	useRef,
	useState,
} from "@tiendanube/nube-sdk-react-runtime";
import type { CSSProperties, ReactElement } from "react";
import { classNames } from "../../helpers/class-names";
import { Icon } from "../Icon";
import { useToastPosition } from "./useToastPosition";

const TOAST_DURATION = 3000;

export type ToastRootProps = {
	variant?: "success" | "error" | "warning" | "info";
	duration?: number;
	children: ReactElement | ReactElement[];
	style?: CSSProperties;
	__internalId?: string;
};

export const ToastRoot = ({
	variant = "success",
	duration = TOAST_DURATION,
	__internalId,
	children,
	style,
}: ToastRootProps) => {
	const [isLeaving, setIsLeaving] = useState(false);
	const toastRef = useRef<HTMLDivElement>(null);
	const currentPosition = useToastPosition(toastRef);

	const startCloseSequence = useCallback(() => {
		setIsLeaving(true);
	}, []);

	useEffect(() => {
		if (duration > 0) {
			const timer = setTimeout(() => {
				startCloseSequence();
			}, duration);

			return () => clearTimeout(timer);
		}
		return undefined;
	}, [duration, startCloseSequence]);

	return (
		<div
			id={__internalId}
			className={classNames(
				"nube-toast-root toast-container",
				currentPosition && `toast-${currentPosition}`,
			)}
			ref={toastRef}
		>
			<div
				className={classNames("toast", `toast-${variant}`, {
					"toast-leaving": isLeaving,
				})}
				style={style}
			>
				<div className="toast-content">{children}</div>
				<button
					type="button"
					className="toast-close"
					onClick={startCloseSequence}
					// TODO: internacionalizar
					aria-label="close"
				>
					<Icon name="close" size={16} />
				</button>
			</div>
		</div>
	);
};
