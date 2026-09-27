import type { WorkerMessage } from "@tiendanube/nube-sdk-internal-types";
import { getStyledComponents } from "./getStyledComponents";
import { appendStyle } from "./style-tag";
import { transformStyledCSS } from "./transformStyledCSS";

export function styledComponentMessageHandler(message: WorkerMessage): void {
	const styledComponents = getStyledComponents(message);
	if (styledComponents.length === 0) return;

	let css = "";

	for (const styledComponent of styledComponents) {
		css += transformStyledCSS(styledComponent);
	}

	appendStyle(message.app, css);
}
