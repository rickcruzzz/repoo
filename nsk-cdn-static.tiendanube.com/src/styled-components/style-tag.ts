import type { AppID } from "@tiendanube/nube-sdk-internal-types";

function generateId(appid: AppID): string {
	return `nubesdk-styled-${appid}`;
}

export function create(appid: AppID): HTMLStyleElement {
	const style = document.createElement("style");
	style.id = generateId(appid);
	document.head.appendChild(style);
	return style;
}

export function get(appid: AppID): HTMLStyleElement {
	const id = generateId(appid);
	const style = document.getElementById(id);
	if (!style) {
		return create(appid);
	}
	return style as HTMLStyleElement;
}

export function remove(appid: AppID): void {
	const style = get(appid);
	if (style) {
		document.head.removeChild(style);
	}
}

export function appendStyle(appid: AppID, styleText: string): void {
	const style = get(appid);
	style.textContent += `\n${styleText}`;
}
