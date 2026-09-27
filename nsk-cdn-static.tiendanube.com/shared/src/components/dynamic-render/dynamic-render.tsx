"use client";

export type NubeComponent = {
	type: string;
	[key: string]: unknown;
};

export type DynamicRenderProps = Readonly<{
	component: NubeComponent;
	props?: Record<string, unknown>;
	disabledComponents?: string[];
	// biome-ignore lint/suspicious/noExplicitAny: ComponentType needs any for flexible component props
	ui: Record<string, any>;
}>;

class ComponentNotSupported extends ReferenceError {
	constructor(type: string) {
		super(`Component "${type}" is not supported`);
		this.name = "NubeSDK.ComponentNotSupported";
	}
}

export function DynamicRender({
	component,
	props: customProps,
	ui,
	disabledComponents,
}: DynamicRenderProps) {
	const { children, type, ...props } = component;
	const Component = ui[type as keyof typeof ui];

	// If the component is in the disabledComponents list, return null
	if (disabledComponents?.includes(type)) {
		console.error(new ComponentNotSupported(type));
		return null;
	}

	if (!Component) {
		console.error(new ComponentNotSupported(type));
		return null;
	}

	let renderedChildren: (JSX.Element | string)[] | JSX.Element | null = null;

	if (children) {
		if (Array.isArray(children)) {
			renderedChildren = children?.map((child) =>
				typeof child === "string" ? (
					child
				) : (
					<DynamicRender
						component={child}
						ui={ui}
						key={child.__internalId}
						disabledComponents={disabledComponents}
					/>
				),
			);
		}

		const child = children as NubeComponent;
		if (typeof child === "object" && typeof child?.type === "string") {
			renderedChildren = (
				<DynamicRender
					component={child}
					ui={ui}
					disabledComponents={disabledComponents}
				/>
			);
		}
	}

	return (
		<Component key={props.__internalId} {...props} {...customProps}>
			{renderedChildren || children}
		</Component>
	);
}
