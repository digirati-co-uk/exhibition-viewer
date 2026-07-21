import { DelftExhibition, type DelftExhibitionProps } from "./DelftExhibition";
import { getThemeClassName, mergeThemeInputs, normalizeThemePreset } from "./theme/exhibition-theme";

export type LeedsFullPageExhibitionProps = DelftExhibitionProps;

export function LeedsFullPageExhibition({ theme, ...props }: LeedsFullPageExhibitionProps) {
  const preset = normalizeThemePreset(theme?.preset || "leeds-white");
  return (
    <div className={`${getThemeClassName(preset)} w-full`}>
      <DelftExhibition
        {...props}
        theme={mergeThemeInputs({ preset: "leeds-white" }, theme)}
      />
    </div>
  );
}
