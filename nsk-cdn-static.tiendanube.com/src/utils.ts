/**
 * Generates a random trace ID according to OpenTelemetry specification.
 * Trace IDs must be exactly 16 bytes (32 hex characters).
 *
 * @returns A 32-character hexadecimal string representing a 16-byte trace ID
 */
export const generateTraceId = (): string => {
	const bytes = new Uint8Array(16);
	crypto.getRandomValues(bytes);
	return Array.from(bytes)
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("");
};

/**
 * Generates a random span ID according to OpenTelemetry specification.
 * Span IDs must be exactly 8 bytes (16 hex characters).
 *
 * @returns A 16-character hexadecimal string representing an 8-byte span ID
 */
export const generateSpanId = (): string => {
	const bytes = new Uint8Array(8);
	crypto.getRandomValues(bytes);
	return Array.from(bytes)
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("");
};
