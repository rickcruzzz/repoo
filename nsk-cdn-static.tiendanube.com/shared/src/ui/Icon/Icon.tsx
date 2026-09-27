import { createElement } from "@tiendanube/nube-sdk-react-runtime";
import type { NubeComponentIconName } from "@tiendanube/nube-sdk-types";
import { type IconName, LocalIcon, hasLocalIcon } from "./LocalIcon";
import { iconMap } from "./icon-map";

// Tipo união que combina ícones do Nimbus e ícones locais
export type AllIconNames = NubeComponentIconName | IconName;

export type IconProps = {
	name: AllIconNames;
	color?: string;
	size?: number | string;
	__internalId?: string;
	className?: string;
};

export function Icon({
	name,
	color = "currentColor",
	size = 24,
	className,
	__internalId,
}: IconProps) {
	// Primeiro tenta encontrar o ícone no mapeamento do Nimbus
	const IconComponent = iconMap[name as NubeComponentIconName];

	if (IconComponent) {
		return createElement(IconComponent, {
			color,
			width: size,
			height: size,
			...(__internalId && { id: __internalId }),
		});
	}

	// Se não encontrar no Nimbus, verifica se existe nos ícones locais
	if (hasLocalIcon(name)) {
		return (
			<LocalIcon
				name={name}
				size={size}
				fill={color}
				className={className}
				{...(__internalId && { className: `svg ${__internalId}` })}
			/>
		);
	}

	// Se não encontrar em nenhum lugar, retorna null
	return null;
}
