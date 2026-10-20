import { DelftExhibition, type DelftExhibitionProps } from "./DelftExhibition";
import {
  type DeepPartial,
  type ExhibitionThemeConfig,
  getThemeClassName,
  mergeThemeInputs,
  normalizeThemePreset,
} from "./theme/exhibition-theme";

export type LeedsFullPageExhibitionProps = DelftExhibitionProps;

export function LeedsFullPageExhibition({ theme, ...props }: LeedsFullPageExhibitionProps) {
  const preset = normalizeThemePreset(theme?.preset || "leeds-white");
  return (
    <div className={`${getThemeClassName(preset)} w-full`}>
      <DelftExhibition
        {...props}
        theme={mergeThemeInputs<DeepPartial<ExhibitionThemeConfig>>({ preset: "leeds-white" }, theme) ?? undefined}
      />
    </div>
  );
}
