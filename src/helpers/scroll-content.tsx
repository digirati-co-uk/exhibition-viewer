import { createContext, useContext, useMemo, type ReactNode } from "react";

/** Every string the scroll layout renders itself. Use `{n}` where a number is substituted. */
export interface ScrollContent {
  tableOfContents: string;
  backToTop: string;
  scrollToTop: string;
  previousSection: string;
  nextSection: string;
  previous: string;
  next: string;
  emptySection: string;
  imageDeck: string;
  manualTour: string;
  tourStop: string;
  tourStopFallback: string;
  previousTourStop: string;
  nextTourStop: string;
  goToTourStop: string;
  imageLabel: string;
  addAnnotationsDeck: string;
  addAnnotationsManualTour: string;
}

export const defaultScrollContent: ScrollContent = {
  tableOfContents: "Table of Contents",
  backToTop: "Back to top",
  scrollToTop: "Scroll to top",
  previousSection: "Previous canvas or tour step",
  nextSection: "Next canvas or tour step",
  previous: "Previous",
  next: "Next",
  emptySection: "Empty section",
  imageDeck: "Image deck",
  manualTour: "Manual tour",
  tourStop: "Stop",
  tourStopFallback: "Tour stop {n}",
  previousTourStop: "Previous tour stop",
  nextTourStop: "Next tour stop",
  goToTourStop: "Go to tour stop {n}",
  imageLabel: "Image {n}",
  addAnnotationsDeck: "Add annotations to this canvas to build a compact deck.",
  addAnnotationsManualTour: "Add annotations to this canvas to build a manual tour.",
};

const ScrollContentContext = createContext<ScrollContent>(defaultScrollContent);

export function ScrollContentProvider({
  content,
  children,
}: {
  content?: Partial<ScrollContent> | null;
  children: ReactNode;
}) {
  const value = useMemo(() => ({ ...defaultScrollContent, ...stripUndefined(content) }), [content]);
  return <ScrollContentContext.Provider value={value}>{children}</ScrollContentContext.Provider>;
}

export function useScrollContent() {
  return useContext(ScrollContentContext);
}

/** Replaces `{n}` with a one-based position. */
export function formatScrollContent(template: string, n: number) {
  return template.replace("{n}", String(n));
}

function stripUndefined(content?: Partial<ScrollContent> | null) {
  return Object.fromEntries(Object.entries(content || {}).filter(([, value]) => value !== undefined));
}
