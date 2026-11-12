import type { SVGProps } from "react";

function Icon({ children, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="1em"
      height="1em"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  );
}

export const AudioPlayGlyph = (props: SVGProps<SVGSVGElement>) => (
  <Icon {...props}>
    <path d="M8 19V5l11 7z" />
  </Icon>
);

export const AudioPauseGlyph = (props: SVGProps<SVGSVGElement>) => (
  <Icon {...props}>
    <path d="M14 19V5h4v14zm-8 0V5h4v14z" />
  </Icon>
);

export const AudioReplayGlyph = (props: SVGProps<SVGSVGElement>) => (
  <Icon {...props}>
    <path d="M12 5V1L7 6l5 5V7a6 6 0 1 1-6 6H4a8 8 0 1 0 8-8z" />
  </Icon>
);

export const AudioVolumeGlyph = (props: SVGProps<SVGSVGElement>) => (
  <Icon {...props}>
    <path d="M3 9v6h4l5 5V4L7 9zm13.5 3A4.5 4.5 0 0 0 14 7.97v8.05A4.5 4.5 0 0 0 16.5 12M14 3.23v2.06a7 7 0 0 1 0 13.42v2.06A9 9 0 0 0 14 3.23" />
  </Icon>
);

export const AudioMutedGlyph = (props: SVGProps<SVGSVGElement>) => (
  <Icon {...props}>
    <path d="M16.5 12A4.5 4.5 0 0 0 14 7.97v2.21l2.45 2.45c.03-.2.05-.41.05-.63M19 12c0 .94-.2 1.82-.54 2.64l1.51 1.51A9 9 0 0 0 21 12a9 9 0 0 0-7-8.77v2.06A7 7 0 0 1 19 12M4.27 3 3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06a9 9 0 0 0 3.69-1.81L19.73 21 21 19.73l-9-9zM12 4 9.91 6.09 12 8.18z" />
  </Icon>
);

export const AudioNoteGlyph = (props: SVGProps<SVGSVGElement>) => (
  <Icon {...props}>
    <path d="M12 3v10.55A4 4 0 1 0 14 17V7h4V3z" />
  </Icon>
);
