import { DelftPresentation, type DelftPresentationProps } from "./DelftPresentation";
import { getThemeClassName, mergeThemeInputs, normalizeThemePreset } from "./theme/exhibition-theme";

export type LeedsSlideshowExhibitionProps = DelftPresentationProps;

export function LeedsSlideshowExhibition({ theme, ...props }: LeedsSlideshowExhibitionProps) {
  const preset = normalizeThemePreset(theme?.preset || "leeds-slideshow");
  return (
    <div className={`${getThemeClassName(preset)} flex h-screen min-h-0 w-full flex-col overflow-hidden`}>
      <DelftPresentation
        {...props}
        theme={mergeThemeInputs({ preset: "leeds-slideshow" }, theme)}
      />
    </div>
  );
}
