import type {
	DeepPartial,
	NubeSDKRuntimeState,
} from "@tiendanube/nube-sdk-internal-types";

export type NubeSDKAppScript = {
	id: string;
	script: string;
	appSettings: Record<string, unknown>;
};

function mapApps(apps: NubeSDKAppScript[]): Record<string, NubeSDKAppScript> {
	return apps.reduce(
		(acc, app) => {
			acc[String(app.id)] = {
				id: String(app.id),
				script: app.script,
				appSettings: app.appSettings,
			};
			return acc;
		},
		{} as Record<string, NubeSDKAppScript>,
	);
}

// Prevents </script> sequences from closing an enclosing script tag prematurely.
// Uses a replacement function to preserve the original casing of the matched text.
function escapeScriptContent(value: string): string {
	return value.replace(
		/<\/script/gi,
		(match) => `${match[0]}\\${match.slice(1)}`,
	);
}

export type BootstrapProps = {
	hostId: string;
	initialState: DeepPartial<NubeSDKRuntimeState>;
	apps: NubeSDKAppScript[];
};

export function Bootstrap({ hostId, initialState, apps }: BootstrapProps) {
	try {
		// hostId remains in executable script text; JSON.stringify handles quotes,
		// backslashes and newlines. escapeScriptContent neutralises </script sequences.
		const safeHostId = escapeScriptContent(JSON.stringify(hostId));

		// initialState and apps are placed in non-executable <script type="application/json">
		// elements so attacker-controlled data never reaches executable script text.
		// </script sequences are still escaped to prevent premature tag closing.
		const safeInitialState = escapeScriptContent(JSON.stringify(initialState));
		const safeApps = escapeScriptContent(JSON.stringify(mapApps(apps)));

		return (
			<>
				<script
					type="application/json"
					id="nube-sdk-state"
					// biome-ignore lint/security/noDangerouslySetInnerHtml: non-executable JSON data element; </script sequences are escaped
					dangerouslySetInnerHTML={{ __html: safeInitialState }}
				/>
				<script
					type="application/json"
					id="nube-sdk-apps"
					// biome-ignore lint/security/noDangerouslySetInnerHtml: non-executable JSON data element; </script sequences are escaped
					dangerouslySetInnerHTML={{ __html: safeApps }}
				/>
				<script
					// biome-ignore lint/security/noDangerouslySetInnerHtml: only hostId is in executable text (JSON-serialized + </script-escaped); state and apps are read from non-executable JSON elements via textContent + JSON.parse
					dangerouslySetInnerHTML={{
						__html: `((global, url, title, referrer, name, scope) => {
  const state = JSON.parse(document.getElementById('nube-sdk-state').textContent);
  const apps = JSON.parse(document.getElementById('nube-sdk-apps').textContent);
  const methods = ["on", "off", "send"];
  const initial = { ...state, location: { ...(state.location || {}), url, title, referrer } };
  global[name] = methods.reduce((sdk, method) => {
    sdk[method] = (...args) => {
      sdk.queue.push([method, ...args]);
    };
    return sdk;
  }, { queue: [] });
  global[name].getState = () => initial;
  global[name].send(scope, "init", () => initial);
  const loadMethod = () => {
    if (apps) {
      global[name].send(scope, "app:register", () => ({ apps }));
    }
  };
  if (document.readyState === "complete") {
    setTimeout(loadMethod);
  } else {
    window.addEventListener("load", loadMethod);
  }
})(window, document.location.href, document.title, document.referrer, "nubeSDK", ${safeHostId});`,
					}}
					data-testid="nube-sdk-bootstrap"
				/>
			</>
		);
	} catch (error) {
		console.error("Failed to initialize NubeSDK:", error);
		return (
			<script
				// biome-ignore lint/security/noDangerouslySetInnerHtml: hardcoded string literal, no user input
				dangerouslySetInnerHTML={{
					__html:
						"console.error('Failed to initialize NubeSDK bootstrap script');",
				}}
				data-testid="nube-sdk-bootstrap"
			/>
		);
	}
}
