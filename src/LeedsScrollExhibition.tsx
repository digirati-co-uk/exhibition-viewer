import { ScrollExhibition, type ScrollExhibitionProps } from "./ScrollExhibition";
import { getThemeClassName, mergeThemeInputs, normalizeThemePreset } from "./theme/exhibition-theme";

export type LeedsScrollExhibitionProps = ScrollExhibitionProps;

export function LeedsScrollExhibition({ theme, ...props }: LeedsScrollExhibitionProps) {
  const preset = normalizeThemePreset(theme?.preset || "leeds-scroll");
  return (
    <div className={`${getThemeClassName(preset)} w-full`}>
      <ScrollExhibition
        {...props}
        theme={mergeThemeInputs({ preset: "leeds-scroll" }, theme)}
      />
    </div>
  );
}
