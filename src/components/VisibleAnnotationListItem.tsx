import type { Canvas } from "@iiif/presentation-3";
import type { CanvasNormalized } from "@iiif/presentation-3-normalized";
import { useEffect, useRef } from "react";
import { LocaleString } from "react-iiif-vault";
import { twMerge } from "tailwind-merge";
import type { ExhibitionStep } from "../helpers/exhibition-store";
import { useStepDetails } from "../helpers/use-step-details";

export function VisibleAnnotationsListingItem({
  canvas,
  step,
  stepIndex,
  index,
  goToStep,
  hoverProps,
}: {
  canvas: CanvasNormalized | Canvas;
  step: ExhibitionStep;
  stepIndex: number;
  index: number;
  hoverProps: any;
  goToStep?: (step: number) => void;
}) {
  const { label, summary, isActive, showBody, showSummary, toShow } = useStepDetails(canvas, step);

  const itemRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (goToStep && index === stepIndex && itemRef.current) {
      itemRef.current.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
        block: "center",
      });
    }
  }, [index, stepIndex]);

  return (
    <div
      data-step-id={index}
      ref={itemRef}
      {...hoverProps}
      className="annotation-list-item cursor-pointer"
      onClick={() => goToStep?.(index)}
      role={goToStep ? "button" : undefined}
      tabIndex={goToStep ? 0 : undefined}
      aria-current={isActive ? "step" : undefined}
      onKeyDown={goToStep ? (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          goToStep(index);
        }
      } : undefined}
    >
      <LocaleString
        as="h3"
        className={twMerge("text-semibold hover:hover:underline", index === stepIndex ? "text-AnnotationSelected" : "")}
      >
        {label}
      </LocaleString>
      <LocaleString as="div" className="annotation-summary whitespace-pre-wrap text-sm" enableDangerouslySetInnerHTML>
        {summary}
      </LocaleString>
      {showBody && toShow
        ? (toShow || []).map((body, n) => {
            if (body.type === "TextualBody") {
              return (
                <div
                  className={twMerge(
                    "prose-sm exhibition-html",
                    "text-semibold hover:hover:underline",
                    index === stepIndex ? "prose-headings:text-AnnotationSelected" : "",
                  )}
                  key={n}
                >
                  <LocaleString enableDangerouslySetInnerHTML>{body.value}</LocaleString>
                </div>
              );
            }
            return null;
          })
        : null}
      {step.objectLink ? (step.objectLink as any).component : null}
    </div>
  );
}
