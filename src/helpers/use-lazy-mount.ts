import { useIntersectionObserver } from "usehooks-ts";

/**
 * Mounts heavy content one viewport ahead of and behind the scroll position. Percentages in `rootMargin` are relative
 * to the viewport, so this needs no window measurements. It stops just short of 100% so that a full-height section
 * two screens away stays unmounted.
 */
export const LAZY_MOUNT_MARGIN = "99% 0px 99% 0px";

export interface UseLazyMountOptions {
  /** Override the look-ahead; `"0px"` mounts only once the section is actually visible. */
  margin?: string;
}

/**
 * Attach `ref` to a section's stable wrapper and only mount viewers, players and images once `shouldMount` is true.
 * Content unmounts again when it scrolls far enough away.
 */
export function useLazyMount({ margin = LAZY_MOUNT_MARGIN }: UseLazyMountOptions = {}) {
  const [ref, shouldMount] = useIntersectionObserver({ rootMargin: margin });
  return [ref, shouldMount] as const;
}
