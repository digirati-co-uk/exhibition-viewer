import { DelftPresentation, type DelftPresentationProps } from "./DelftPresentation";
import {
  type DeepPartial,
  type ExhibitionThemeConfig,
  getThemeClassName,
  mergeThemeInputs,
  normalizeThemePreset,
} from "./theme/exhibition-theme";

export type LeedsSlideshowExhibitionProps = DelftPresentationProps;

export function LeedsSlideshowExhibition({ theme, ...props }: LeedsSlideshowExhibitionProps) {
  const preset = normalizeThemePreset(theme?.preset || "leeds-brown");
  return (
    <div className={`${getThemeClassName(preset)} flex h-screen min-h-0 w-full flex-col overflow-hidden`}>
      <DelftPresentation
        {...props}
        theme={mergeThemeInputs<DeepPartial<ExhibitionThemeConfig>>({ preset: "leeds-brown" }, theme) ?? undefined}
      />
    </div>
  );
}
