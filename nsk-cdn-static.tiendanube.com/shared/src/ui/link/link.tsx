"use client";

import {
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "@tiendanube/nube-sdk-react-runtime";
import type { CSSProperties, MouseEvent, ReactNode } from "react";
import { classNames } from "../../helpers/class-names";
import { useNubeSDK } from "../../hooks/use-nube-sdk";
import { Icon } from "../Icon/Icon";
import { getLinkModalTranslations, translateText } from "./translations";

export type LinkProps = {
	href: string;
	children: ReactNode;
	target?: "_blank" | "_self" | "_parent" | "_top";
	rel?: string;
	__internalId?: string;
	style?: CSSProperties;
	storeName?: string;
};

function isExternalLink(href: string): boolean {
	try {
		const url = new URL(href, window.location.href);
		return url.origin !== window.location.origin;
	} catch {
		return false;
	}
}

export function Link(props: Readonly<LinkProps>) {
	const { href, children, target, rel, __internalId, style, storeName } = props;
	const [showModal, setShowModal] = useState(false);
	const dialogRef = useRef<HTMLDialogElement>(null);
	const { state } = useNubeSDK("adapter");

	const getStoreName = useCallback(() => {
		if (storeName) return storeName;
		return state?.store?.name || "";
	}, [storeName, state]);

	const handleClick = useCallback(
		(e: MouseEvent<HTMLAnchorElement>) => {
			// Only show modal for external links
			if (isExternalLink(href)) {
				e.preventDefault();
				setShowModal(true);
			}
		},
		[href],
	);

	const handleClose = useCallback(() => {
		setShowModal(false);
		dialogRef.current?.close();
	}, []);

	const handleContinue = useCallback(() => {
		handleClose();
		if (target === "_blank") {
			window.open(href, target, rel);
		} else {
			window.location.href = href;
		}
	}, [href, target, rel, handleClose]);

	const handleStay = useCallback(() => {
		handleClose();
	}, [handleClose]);

	const handleOutsideClick = useCallback(
		(e: MouseEvent<HTMLDialogElement>) => {
			const dialog = dialogRef.current;
			if (!dialog) return;

			const rect = dialog.getBoundingClientRect();
			const isInDialog =
				rect.top <= e.clientY &&
				e.clientY <= rect.top + rect.height &&
				rect.left <= e.clientX &&
				e.clientX <= rect.left + rect.width;

			if (!isInDialog) {
				handleClose();
			}
		},
		[handleClose],
	);

	const externalLink = isExternalLink(href);
	const currentStoreName = getStoreName();
	const language = state?.store?.language;
	const translations = useMemo(
		() => getLinkModalTranslations(language),
		[language],
	);
	const translatedTitle = useMemo(
		() => translateText(translations.title, { store_name: currentStoreName }),
		[translations.title, currentStoreName],
	);

	useEffect(() => {
		const dialog = dialogRef.current;
		if (!dialog) return;

		if (showModal) {
			dialog.showModal();
		} else {
			dialog.close();
		}

		const handleDialogClose = () => {
			setShowModal(false);
		};

		dialog.addEventListener("close", handleDialogClose);

		return () => {
			dialog.removeEventListener("close", handleDialogClose);
		};
	}, [showModal]);

	return (
		<>
			<a
				href={href}
				target={target}
				rel={rel}
				className="nube-link"
				id={__internalId}
				style={style}
				onClick={externalLink ? handleClick : undefined}
			>
				{children}
			</a>
			{showModal && (
				<dialog
					ref={dialogRef}
					className="nube-link-modal"
					onClick={handleOutsideClick}
					onKeyDown={(e) => {
						if (e.key === "Escape") {
							handleClose();
						}
					}}
				>
					<div className="nube-link-modal-content">
						<div className="nube-link-modal-header">
							<h2 className="nube-link-modal-title">{translatedTitle}</h2>
							<button
								type="button"
								onClick={handleClose}
								onKeyDown={(e) => {
									if (e.key === "Enter" || e.key === " ") {
										e.preventDefault();
										handleClose();
									}
								}}
								className="nube-link-modal-close-button"
								aria-label={translations.closeButton}
							>
								<Icon name="close" size={16} __internalId="close-modal-icon" />
							</button>
						</div>
						<p className="nube-link-modal-description">
							{translations.description}
						</p>
						<div className="nube-link-modal-url">{href}</div>
						<div className="nube-link-modal-actions">
							<button
								type="button"
								onClick={handleStay}
								onKeyDown={(e) => {
									if (e.key === "Enter" || e.key === " ") {
										e.preventDefault();
										handleStay();
									}
								}}
								className={classNames("btn", "btn-secondary")}
							>
								{translations.stayButton}
							</button>
							<button
								type="button"
								onClick={handleContinue}
								onKeyDown={(e) => {
									if (e.key === "Enter" || e.key === " ") {
										e.preventDefault();
										handleContinue();
									}
								}}
								className={classNames("btn", "btn-primary")}
							>
								{translations.continueButton}
							</button>
						</div>
					</div>
				</dialog>
			)}
		</>
	);
}
