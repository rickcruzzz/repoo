import { attach } from "./attach";

if (window.nubeSDK) {
	attach().catch((err) => {
		console.error("Unable to attach register to NubeSDK", err);
	});
}
