import { getThemeClassName, type ExhibitionThemePreset } from "./theme/exhibition-theme";

export type ExhibitionThemeGroup = "custom" | "leeds" | "delft";

export interface ExhibitionThemeOption {
  label: string;
  className: string;
  group: ExhibitionThemeGroup;
}

const theme = (
  label: string,
  preset: ExhibitionThemePreset,
  group: ExhibitionThemeGroup,
): ExhibitionThemeOption => ({ label, className: getThemeClassName(preset), group });

export const themes: ExhibitionThemeOption[] = [
  theme("Delft", "delft", "delft"),
  theme("Minimal", "minimal", "custom"),
  theme("Gallery", "gallery", "custom"),
  theme("Nocturne", "nocturne", "custom"),
  theme("Leeds White", "leeds-white", "leeds"),
  theme("Leeds Pink", "leeds-pink", "leeds"),
  theme("Leeds Orange", "leeds-orange", "leeds"),
  theme("Leeds Brown", "leeds-brown", "leeds"),
];
