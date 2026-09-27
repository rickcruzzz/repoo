import { ICONS, type IconName, getSvgPath } from "./local-icon-map";

// Re-export do tipo IconName para uso externo
export type { IconName } from "./local-icon-map";

export type LocalIconProps = {
	name: IconName;
	size?: string | number;
	className?: string;
	viewBox?: string;
	fill?: string;
};

export function LocalIcon({
	name,
	size = 16,
	className = "svg",
	viewBox = "0 0 1024 1024",
	fill,
}: LocalIconProps) {
	// Verifica se o ícone existe no mapeamento local
	if (!(name in ICONS)) {
		return null;
	}

	const path = getSvgPath(name) as string | React.ReactElement[];

	if (!path) {
		return null;
	}

	return (
		<svg
			className={className}
			width={typeof size === "string" ? size : `${size}px`}
			height={typeof size === "string" ? size : `${size}px`}
			viewBox={viewBox}
			fill={fill}
			role="img"
			aria-label={`Icon ${name}`}
		>
			{Array.isArray(path) ? path.map((item) => item) : <path d={path} />}
		</svg>
	);
}

// Função auxiliar para verificar se um ícone local existe
export function hasLocalIcon(name: string): name is IconName {
	return name in ICONS;
}
