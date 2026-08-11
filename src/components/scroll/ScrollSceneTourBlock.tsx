import type { AnnotationNormalized, SceneNormalized, Vault4 } from "react-iiif-vault/presentation-4";
import { LocaleString, useVault, useVaultSelector } from "react-iiif-vault/presentation-4";
import { ScenePanel, sanitizeIiifHtml, type ScenePanelHandle } from "react-iiif-vault/scene-panel";
import "react-iiif-vault/scene-panel.css";
import { useEffect, useMemo, useRef, useState } from "react";

export interface ScrollSceneTourBlockProps {
  scene: SceneNormalized;
  id?: string;
  index: number;
}

type SceneTourStep = {
  id: string;
  label: AnnotationNormalized["label"];
  summary: AnnotationNormalized["summary"];
  body?: { format?: string; value?: string };
  cameraId?: string;
};

export function ScrollSceneTourBlock({ scene, id, index }: ScrollSceneTourBlockProps) {
  const vault = useVault();
  const panel = useRef<ScenePanelHandle>(null);
  const container = useRef<HTMLElement>(null);
  const [activeStep, setActiveStep] = useState(0);
  const [sceneReady, setSceneReady] = useState(false);
  const [resourcesReady, setResourcesReady] = useState(false);

  const paintingAnnotations = useVaultSelector((_, vault) => getScenePaintingAnnotations(scene, vault), [scene]);
  const steps = useVaultSelector((_, vault) => getSceneTourSteps(scene, vault), [scene]);
  const modelAnnotation = paintingAnnotations.find((annotation) => vault.get(annotation.body)?.type === "Model");
  const displayedSteps: SceneTourStep[] = useMemo(
    () =>
      steps.length
        ? steps
        : [
            {
              id: modelAnnotation?.id || scene.id,
              label: scene.label,
              summary: scene.summary,
            },
          ],
    [modelAnnotation?.id, scene.id, scene.label, scene.summary, steps],
  );

  useEffect(() => {
    let frame = 0;

    function updateActiveStep() {
      frame = 0;
      const top = container.current?.getBoundingClientRect().top;
      if (top === undefined) return;
      setActiveStep(Math.max(0, Math.min(displayedSteps.length - 1, Math.floor((-top + window.innerHeight / 2) / window.innerHeight))));
    }

    function requestUpdate() {
      if (!frame) frame = window.requestAnimationFrame(updateActiveStep);
    }

    updateActiveStep();
    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate);
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", requestUpdate);
      window.removeEventListener("resize", requestUpdate);
    };
  }, [displayedSteps.length]);

  useEffect(() => {
    if (!sceneReady || !resourcesReady || !panel.current) return;
    const step = displayedSteps[activeStep];
    if (!step) return;

    if (step.cameraId) {
      panel.current.activate(step.id);
      return;
    }

    if (modelAnnotation) {
      panel.current.frameAnnotation(modelAnnotation.id, { padding: 1.35 });
    }
  }, [activeStep, displayedSteps, modelAnnotation, resourcesReady, sceneReady]);

  return (
    <section
      id={id || `${index}`}
      ref={container}
      className="relative bg-black text-white"
      data-tour-steps={steps.length}
    >
      <div className="sticky top-0 h-screen overflow-hidden" onWheelCapture={(event) => event.stopPropagation()}>
        <ScenePanel
          ref={panel}
          scene={scene.id}
          vault={vault}
          annotations="none"
          cameraCue={false}
          className="h-full"
          stage={{ backgroundColor: "#111827", floorColor: "#374151", gridColor: "#6b7280" }}
          transitions={{ duration: 1.2 }}
          loadingFallback={<span>Preparing the 3D scene…</span>}
          errorFallback={<span>This 3D scene could not be displayed.</span>}
          onReady={() => setSceneReady(true)}
          onResourceStatusChange={(resources) =>
            setResourcesReady(resources.length > 0 && resources.every((resource) => resource.status !== "loading"))
          }
        />
      </div>

      <div className="pointer-events-none relative z-20 -mt-[100vh]" data-annotation-list="true">
        {displayedSteps.map((step, stepIndex) => {
          const stepId = `${id || index}-step-${stepIndex}`;
          return (
            <article
              id={stepId}
              key={step.id}
              className="flex h-screen scroll-mt-12 items-center py-20 pl-5 pr-16 sm:px-5 lg:px-12"
              data-step-id={stepId}
            >
              <div className="pointer-events-auto w-full max-w-md border-l-4 border-amber-400 bg-white/95 p-6 text-zinc-900 shadow-2xl backdrop-blur-sm lg:p-8">
                <div className="mb-3 font-mono text-xs uppercase tracking-[0.16em] text-zinc-500">
                  3D tour · {stepIndex + 1} / {displayedSteps.length}
                </div>
                {step.label ? (
                  <LocaleString as="h2" className="m-0 text-2xl font-semibold leading-tight">
                    {step.label}
                  </LocaleString>
                ) : null}
                {step.summary ? (
                  <LocaleString as="p" className="mt-3 text-sm leading-relaxed text-zinc-600">
                    {step.summary}
                  </LocaleString>
                ) : null}
                {step.body?.value ? (
                  step.body.format === "text/html" ? (
                    <div
                      className="exhibition-html mt-4 text-base leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: sanitizeIiifHtml(step.body.value) }}
                    />
                  ) : (
                    <p className="mt-4 text-base leading-relaxed">{step.body.value}</p>
                  )
                ) : null}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function getScenePaintingAnnotations(scene: SceneNormalized, vault: Vault4): AnnotationNormalized[] {
  return scene.items.flatMap((pageRef) => {
    const page = vault.get(pageRef);
    return page?.type === "AnnotationPage"
      ? (page.items.map((annotationRef) => vault.get(annotationRef)).filter(Boolean) as AnnotationNormalized[])
      : [];
  });
}

function getSceneTourSteps(scene: SceneNormalized, vault: Vault4): SceneTourStep[] {
  return scene.annotations.flatMap((pageRef) => {
    const page = vault.get(pageRef);
    if (page?.type !== "AnnotationPage") return [];

    return page.items.flatMap((annotationRef) => {
      const annotation = vault.get(annotationRef);
      if (annotation?.type !== "Annotation" || !annotation.motivation.includes("commenting")) return [];
      const body = vault.get(annotation.body);
      return [
        {
          id: annotation.id,
          label: annotation.label,
          summary: annotation.summary,
          body: body?.type === "TextualBody" ? { format: body.format, value: body.value } : undefined,
          cameraId: annotation.scope?.[0]?.id,
        },
      ];
    });
  });
}
