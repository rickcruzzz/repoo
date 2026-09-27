import { h, render } from "preact";
import { exposePreactGlobals } from "./expose-preact";
import { registerVidstackCdnLoader } from "./setup-vidstack-loader";

// Run at IIFE init, before any video mounts:
//  - expose this adapter's Preact instance on globals for the CDN Vidstack artifact
//  - register the CDN loader so Vidstack is fetched at runtime, not bundled
// Called (not bare-imported) so they survive `"sideEffects": false` tree-shaking.
exposePreactGlobals();
registerVidstackCdnLoader();

export { Loader, type LoaderProps } from "./ssr-safe";
export { Runtime } from "./client";
export { Slot } from "./client";
export { render, h };
