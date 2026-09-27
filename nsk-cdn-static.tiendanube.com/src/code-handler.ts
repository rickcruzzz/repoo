import type {
	AppState,
	NubeApp,
	NubeSDKRuntimeState,
} from "@tiendanube/nube-sdk-internal-types";
import { INITIALIZER_SRC } from "./config";

const APP_DATA = "__APP_DATA__";
const INITIAL_STATE = "__INITIAL_STATE__";

export function extractCodeFromBundle(input: string): string {
	return input
		.replace(/"use strict";\s*/, "")
		.replace(/^\(\s*\(\)\s*=>\s*\{([\s\S]*)\}\s*\)\(\);\s*$/, "$1")
		.trim();
}

export function addLabel(name: string, code: string) {
	const label = name.toUpperCase();
	return `/** INJECTED ${label} **/\n${code}\n/** END OF ${label} **/\n`;
}

export function serializeAppData(app: AppState) {
	const { id, script } = app;
	const data = JSON.stringify({
		id,
		script,
		appSettings: app.appSettings ?? {},
	});
	const code = `self.${APP_DATA} = Object.freeze(${data});`;
	return addLabel("app data", code);
}

export function serializeInitialState(runtimeState: NubeSDKRuntimeState) {
	const { apps, ...state } = runtimeState;
	const data = JSON.stringify(state);
	const code = `self.${INITIAL_STATE} = Object.freeze(${data});`;
	return addLabel("initial state", code);
}

type PartnerAppModule = { App?: NubeApp };

export async function importApp(
	app: Pick<AppState, "id" | "script">,
): Promise<PartnerAppModule> {
	const mod = await import(app.script);
	return mod;
}

export async function getAppInitializer(): Promise<string> {
	const response = await fetch(INITIALIZER_SRC);
	const text = await response.text();
	const code = addLabel("app initializer", extractCodeFromBundle(text));
	return code;
}
