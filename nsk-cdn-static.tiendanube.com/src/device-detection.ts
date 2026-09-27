/**
 * Device detection utilities for the NubeSDK runtime
 */

import type { Device, DeviceScreen } from "@tiendanube/nube-sdk-internal-types";

export type DeviceType = "mobile" | "desktop";
export type Orientation = "portrait" | "landscape";

/**
 * Detects the current device orientation based on screen orientation API
 * Falls back to landscape if orientation API is not available
 */
export const getOrientation = (): Orientation => {
	const orientation = window.screen.orientation?.type;
	if (!orientation) return "landscape";

	return orientation.startsWith("portrait") ? "portrait" : "landscape";
};

/**
 * Detects the device type (mobile or desktop) based on:
 * - User agent string analysis
 * - Screen dimensions
 * - Combination of both for better accuracy
 */
export const getDeviceType = (): DeviceType => {
	const userAgent = navigator.userAgent.toLowerCase();
	const screenWidth = window.screen.width;
	const screenHeight = window.screen.height;
	const maxDimension = Math.max(screenWidth, screenHeight);

	// Check for mobile user agents
	const mobileRegex =
		/android|webos|iphone|ipod|blackberry|iemobile|opera mini/i;
	const isMobileUA = mobileRegex.test(userAgent);

	// Screen size based detection
	if (maxDimension <= 768) {
		return "mobile";
	}

	if (maxDimension <= 1024) {
		// If user agent suggests mobile but screen is larger, it might be a large phone
		return isMobileUA ? "mobile" : "desktop";
	}

	// Large screens are typically desktop
	return "desktop";
};

/**
 * Gets screen information including dimensions, orientation, and pixel ratio
 */
export const getDeviceScreen = (): DeviceScreen =>
	Object.freeze({
		width: window.screen.width,
		height: window.screen.height,
		orientation: getOrientation(),
		pixelRatio: window.devicePixelRatio || 1,
		innerWidth: window.innerWidth,
		innerHeight: window.innerHeight,
	});

/**
 * Gets comprehensive device information including type, screen details, and orientation
 */
export const getDeviceInfo = (): Device =>
	Object.freeze({
		type: getDeviceType(),
		screen: getDeviceScreen(),
	});
