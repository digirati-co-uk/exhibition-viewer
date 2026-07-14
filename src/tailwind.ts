export const colors = {
  // Background colors
  BackgroundPrimary: "var(--delft-bg-primary)",
  BackgroundSecondary: "var(--delft-bg-secondary)",
  BackgroundOverlay: "var(--delft-bg-overlay)",

  // Text colors
  TextPrimary: "var(--delft-text-primary)",
  TextSecondary: "var(--delft-text-secondary)",
  ImageCaption: "var(--delft-image-caption)",
  AnnotationSelected: "var(--delft-annotation-selected)",

  // UI elements
  ControlBar: "var(--delft-control-bar)",
  ControlBarText: "var(--delft-control-bar-text)",
  ControlBarBorder: "var(--delft-control-bar-border)",
  ControlHover: "var(--delft-control-hover)",

  ProgressBar: "var(--delft-progress-bar)",

  CloseBackground: "var(--delft-close-background)",
  CloseBackgroundHover: "var(--delft-close-background-hover)",
  CloseText: "var(--delft-close-text)",

  // Title elements
  TitleCard: "var(--delft-title-card)",
  TitleCardText: "var(--delft-title-card-text)",

  // Info blocks
  InfoBlock: "var(--delft-info-block)",
  InfoBlockText: "var(--delft-info-block-text)",

  // Viewer elements
  ViewerBackground: "var(--delft-viewer-background)",
};

export const typography = {
  DEFAULT: {
    css: {
      "--tw-prose-body": "currentColor",
      "--tw-prose-headings": "currentColor",
      "--tw-prose-lead": "currentColor",
      "--tw-prose-links": "currentColor",
      "--tw-prose-bold": "currentColor",
      "--tw-prose-counters": "currentColor",
      "--tw-prose-bullets": "currentColor",
      "--tw-prose-hr": "currentColor",
      "--tw-prose-quotes": "currentColor",
      "--tw-prose-quote-borders": "currentColor",
      "--tw-prose-captions": "currentColor",
      "--tw-prose-code": "currentColor",
      "--tw-prose-pre-code": "currentColor",
      "--tw-prose-th-borders": "currentColor",
      "--tw-prose-td-borders": "currentColor",
      a: {
        "text-decoration": "none",
        "font-weight": "500",
      },
      "h1, h2, h3, h4, h5": {
        "font-weight": "500",
      },
      strong: {
        "font-weight": "500",
      },
      blockquote: {
        "font-weight": "normal",
      },
    },
  },
};
