"use client";

import { DynamicRender, type DynamicRenderProps } from "./dynamic-render";
import { ui } from "./ui";

export type DynamicRenderWithUIProps = Omit<DynamicRenderProps, "ui">;

export function DynamicRenderWithUI(props: DynamicRenderWithUIProps) {
	return <DynamicRender ui={ui} {...props} />;
}
