// Expose the adapter's single Preact instance on globals so the separately-
// loaded Vidstack CDN artifact resolves react/react-dom/jsx-runtime to THIS
// instance (shared reconciler → hooks/context work). Called at IIFE init,
// before any video mounts and fetches the artifact.
//
// Exposed as a function (not a bare side-effect import) so it survives the
// package's `"sideEffects": false` tree-shaking — `index.ts` calls it.
import * as PreactCompat from "preact/compat";
import * as PreactJsx from "preact/jsx-runtime";

export function exposePreactGlobals(): void {
	// biome-ignore lint/suspicious/noExplicitAny: writing framework refs to globals
	const g = globalThis as any;
	g.__NUBE_PREACT_COMPAT__ = PreactCompat;
	g.__NUBE_PREACT_JSX__ = PreactJsx;
}
