import { version } from "../package.json";

declare const __BUNDLE_VERSION__: string;
declare const __NUBE_SDK_CDN_URL__: string | undefined;

const bundleVersion =
	typeof __BUNDLE_VERSION__ !== "undefined" && __BUNDLE_VERSION__
		? __BUNDLE_VERSION__
		: version;

const cdnBase =
	typeof __NUBE_SDK_CDN_URL__ !== "undefined" && __NUBE_SDK_CDN_URL__
		? __NUBE_SDK_CDN_URL__
		: "https://nsk-cdn-static.tiendanube.com";

export const MINIFY = true;
export const EXTENSION = MINIFY ? ".min.js" : ".js";
export const CDN = `${cdnBase}/`;
export const REGISTER_BUNDLE_NAME = `register-${bundleVersion}`;
export const REGISTER_SRC = `${CDN}${REGISTER_BUNDLE_NAME}${EXTENSION}`;
export const INITIALIZER_BUNDLE_NAME = `initializer-${bundleVersion}`;
export const INITIALIZER_SRC = `${CDN}${INITIALIZER_BUNDLE_NAME}${EXTENSION}`;
