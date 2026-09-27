import { classNames } from "../../helpers/class-names";
import { useNubeSDK } from "../../hooks/use-nube-sdk";

type ButtonProps = {
	id: string;
	children: string;
	__internalId: string;
	disabled?: boolean;
	onClick?: boolean;
	variant?: "primary" | "secondary" | "transparent" | "link";
	// biome-ignore lint/suspicious/noExplicitAny: we need to support any style
	style?: any;
	ariaLabel?: string;
};

export function Button({
	id,
	children,
	__internalId,
	disabled,
	onClick,
	variant = "primary",
	style = {},
	ariaLabel,
	...props
}: Readonly<ButtonProps>) {
	const { send } = useNubeSDK("adapter");

	const handleClick = () => {
		if (onClick) {
			send(`custom:button:${__internalId}:click`, () => ({
				ui: {
					values: {
						[__internalId]: undefined,
					},
				},
			}));
		}
	};

	const className = classNames("nube-button btn", {
		"btn-primary": variant === "primary",
		"btn-secondary": variant === "secondary",
		"btn-transparent": variant === "transparent",
		"btn-link": variant === "link",
		"btn-disabled": disabled,
	});

	return (
		<button
			type="button"
			style={{ ...props, ...style }}
			id={__internalId}
			data-component-id={id}
			className={className}
			onClick={handleClick}
			disabled={disabled}
			aria-label={ariaLabel}
		>
			{children}
		</button>
	);
}
