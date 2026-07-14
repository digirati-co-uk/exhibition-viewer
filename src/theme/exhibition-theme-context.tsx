import { Dialog } from "@headlessui/react";
import { createContext, useContext, type ReactNode } from "react";
import { twMerge } from "tailwind-merge";
import { getThemeCssVariables, type ExhibitionThemeConfig } from "./exhibition-theme";

const ExhibitionThemeContext = createContext<ExhibitionThemeConfig | null>(null);

export function ExhibitionThemeProvider({ theme, children }: { theme: ExhibitionThemeConfig; children: ReactNode }) {
  return <ExhibitionThemeContext.Provider value={theme}>{children}</ExhibitionThemeContext.Provider>;
}

export const ExhibitionDialog = Object.assign(
  function ExhibitionDialog({ className, style, ...props }: any) {
    const theme = useContext(ExhibitionThemeContext);
    const RootDialog = Dialog as any;

    return (
      <RootDialog
        {...props}
        className={twMerge(theme ? `${theme.preset}-exhibition` : undefined, className)}
        style={{ ...(theme ? getThemeCssVariables(theme) : {}), ...style }}
      />
    );
  },
  { Panel: Dialog.Panel },
);
