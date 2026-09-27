import type { Prettify } from "@tiendanube/nube-sdk-types";
import { Bootstrap, type BootstrapProps } from "../bootstrap";
import { Scripts, type ScriptsProps } from "../scripts";

export type LoaderProps = Prettify<ScriptsProps & BootstrapProps> & {
	disableInlineStyle?: boolean;
	css?: string;
};

export function Loader({
	withTelemetry,
	allowUnsafeCSS,
	hostId,
	initialState,
	apps,
	disableInlineStyle = false,
	css,
}: LoaderProps) {
	return (
		<>
			<Bootstrap hostId={hostId} initialState={initialState} apps={apps} />
			<Scripts withTelemetry={withTelemetry} allowUnsafeCSS={allowUnsafeCSS} />
			{!disableInlineStyle && css && (
				<style
					id="nube-sdk-base-styles"
					// biome-ignore lint/security/noDangerouslySetInnerHtml: <explanation>
					dangerouslySetInnerHTML={{ __html: css }}
				/>
			)}
		</>
	);
}
