import type { SVGProps } from "react";

export function RestartIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" {...props}>
      <title>Restart</title>
      <path
        fill="currentColor"
        d="M12 5a7 7 0 1 1-6.3 10H3.5A9 9 0 1 0 5.8 5.8L3 3v7h7L7.2 7.2A7 7 0 0 1 12 5Z"
      />
    </svg>
  );
}
