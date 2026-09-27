import {
	Loader as BaseLoader,
	type LoaderProps as BaseLoaderProps,
	Bootstrap,
	type BootstrapProps,
	Scripts,
	type ScriptsProps,
} from "@tiendanube/nube-sdk-shared";
// SSR-safe components (can be rendered on server or client)
import { h } from "preact";
import css from "./style.css";

export type { BootstrapProps, ScriptsProps };
export { Bootstrap, Scripts };

export type LoaderProps = BaseLoaderProps;

export function Loader(props: LoaderProps) {
	return h(BaseLoader, { ...props, css });
}
