import { DelftExhibition, type DelftExhibitionProps } from "./DelftExhibition";
import { mergeThemeInputs } from "./theme/exhibition-theme";

export type LeedsFullPageExhibitionProps = DelftExhibitionProps;

export function LeedsFullPageExhibition({ theme, ...props }: LeedsFullPageExhibitionProps) {
  return (
    <div className="leeds-full-page-exhibition w-full">
      <DelftExhibition
        {...props}
        theme={mergeThemeInputs(theme, { preset: "leeds-full-page" })}
      />
    </div>
  );
}
