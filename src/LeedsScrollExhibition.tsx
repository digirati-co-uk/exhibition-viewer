import { ScrollExhibition, type ScrollExhibitionProps } from "./ScrollExhibition";
import {
  type DeepPartial,
  type ExhibitionThemeConfig,
  getThemeClassName,
  mergeThemeInputs,
  normalizeThemePreset,
} from "./theme/exhibition-theme";

export type LeedsScrollExhibitionProps = ScrollExhibitionProps;

export function LeedsScrollExhibition({ theme, ...props }: LeedsScrollExhibitionProps) {
  const preset = normalizeThemePreset(theme?.preset || "leeds-brown");
  return (
    <div className={`${getThemeClassName(preset)} w-full`}>
      <ScrollExhibition
        {...props}
        theme={mergeThemeInputs<DeepPartial<ExhibitionThemeConfig>>({ preset: "leeds-brown" }, theme) ?? undefined}
      />
    </div>
  );
}
