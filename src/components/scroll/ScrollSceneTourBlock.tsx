import type { AnnotationNormalized, SceneNormalized, Vault4 } from "react-iiif-vault/presentation-4";
import { LocaleString, useVault, useVaultSelector } from "react-iiif-vault/presentation-4";
import { parseSceneTarget } from "@iiif/helpers/scenes";
import { ScenePanel, sanitizeIiifHtml, type ScenePanelHandle, type SceneView } from "react-iiif-vault/scene-panel";
import "react-iiif-vault/scene-panel.css";
import { useScrollTheme } from "@/theme/scroll-theme";
import { useEffect, useMemo, useRef, useState } from "react";
import { Euler, MathUtils, Matrix4, Quaternion, Vector3 } from "three";
import { twMerge } from "tailwind-merge";

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
  behavior?: readonly string[];
  cameraId?: string;
  view?: SceneView;
};

const CAMERA_HOLD = 0.25;
const STEP_STRIDE = 2;

export function ScrollSceneTourBlock({ scene, id, index }: ScrollSceneTourBlockProps) {
  const vault = useVault();
  const panel = useRef<ScenePanelHandle>(null);
  const container = useRef<HTMLElement>(null);
  const activeStep = useRef<string>();
  const [sceneReady, setSceneReady] = useState(false);
  const [resourcesReady, setResourcesReady] = useState(false);
  const { annotationBlock } = useScrollTheme();

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

    function updateView() {
      frame = 0;
      const top = container.current?.getBoundingClientRect().top;
      if (top === undefined) return;
      const progress = Math.max(
        0,
        Math.min(displayedSteps.length - 1, -top / (window.innerHeight * STEP_STRIDE)),
      );
      const stepIndex = Math.round(progress);

      if (!sceneReady || !resourcesReady || !panel.current) return;

      const step = displayedSteps[stepIndex];
      const stepChanged = activeStep.current !== step.id;
      if (stepChanged) {
        activeStep.current = step.id;
        panel.current.activate(step.id);
      }

      const from = displayedSteps[Math.floor(progress)]?.view;
      const to = displayedSteps[Math.ceil(progress)]?.view;
      if (from && to) {
        const segmentProgress = progress - Math.floor(progress);
        const movingProgress = Math.max(
          0,
          Math.min(1, (segmentProgress - CAMERA_HOLD) / (1 - CAMERA_HOLD * 2)),
        );
        const easedProgress = movingProgress * movingProgress * (3 - 2 * movingProgress);
        panel.current.setView(interpolateSceneView(from, to, easedProgress), { transition: false });
      } else if (stepChanged && !step.cameraId && modelAnnotation) {
        panel.current.frameAnnotation(modelAnnotation.id, { padding: 1.35 });
      }
    }

    function requestUpdate() {
      if (!frame) frame = window.requestAnimationFrame(updateView);
    }

    updateView();
    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate);
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", requestUpdate);
      window.removeEventListener("resize", requestUpdate);
    };
  }, [displayedSteps, modelAnnotation, resourcesReady, sceneReady]);

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
          transitions={false}
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
          const side = step.behavior?.includes("right") ? "right" : "left";
          return (
            <article
              id={stepId}
              key={step.id}
              className={twMerge(
                "mb-[100vh] flex h-screen w-full scroll-mt-12 items-center prose-headings:mt-0 last:mb-0",
                side === "right" ? "justify-end" : "justify-start",
              )}
              data-step-id={stepId}
            >
              <div className={twMerge(annotationBlock.className, "pointer-events-auto")}>
                {step.label ? (
                  <LocaleString as="h3" className="text-semibold">
                    {step.label}
                  </LocaleString>
                ) : null}
                {step.summary ? (
                  <LocaleString
                    as="div"
                    className={twMerge("whitespace-pre-wrap text-sm", step.label && "annotation-summary")}
                    enableDangerouslySetInnerHTML
                  >
                    {step.summary}
                  </LocaleString>
                ) : null}
                {step.body?.value ? (
                  step.body.format === "text/html" ? (
                    <div
                      className="prose-sm exhibition-html text-semibold"
                      dangerouslySetInnerHTML={{ __html: sanitizeIiifHtml(step.body.value) }}
                    />
                  ) : (
                    <div className="prose-sm exhibition-html text-semibold">{step.body.value}</div>
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
          behavior: annotation.behavior,
          cameraId: annotation.scope?.[0]?.id,
          view: getCameraView(annotation, scene, vault),
        },
      ];
    });
  });
}

function getCameraView(annotation: AnnotationNormalized, scene: SceneNormalized, vault: Vault4): SceneView | undefined {
  const cameraAnnotation = vault.get(annotation.scope?.[0]);
  if (cameraAnnotation?.type !== "Annotation") return;
  const camera = vault.get(cameraAnnotation.body);
  if (camera?.type !== "PerspectiveCamera" && camera?.type !== "OrthographicCamera") return;

  const positionResource = vault.get(cameraAnnotation.target, {
    parent: cameraAnnotation,
    preserveSpecificResources: true,
    skipSelfReturn: false,
  });
  const lookAtResource = vault.get(camera.lookAt, {
    parent: camera,
    preserveSpecificResources: true,
    skipSelfReturn: false,
  });
  const position = parseSceneTarget(positionResource || cameraAnnotation.target, scene).point;
  const target = parseSceneTarget(lookAtResource || camera.lookAt, scene).point;
  if (!position || !target) return;

  return {
    projection: camera.type === "PerspectiveCamera" ? "perspective" : "orthographic",
    position,
    rotation: getCameraRotation(position, target),
    target,
    up: [0, 1, 0],
    fieldOfView: camera.type === "PerspectiveCamera" ? camera.fieldOfView : undefined,
    viewHeight: camera.type === "OrthographicCamera" ? camera.viewHeight : undefined,
    near: camera.near ?? 0.01,
    far: camera.far ?? 1000,
  };
}

function interpolateSceneView(from: SceneView, to: SceneView, progress: number): SceneView {
  if (progress === 0) return from;
  if (progress === 1) return to;

  const targetVector = new Vector3(...from.target).lerp(new Vector3(...to.target), progress);
  const fromOffset = new Vector3(...from.position).sub(new Vector3(...from.target));
  const toOffset = new Vector3(...to.position).sub(new Vector3(...to.target));
  const fromDirection = fromOffset.clone().normalize();
  const toDirection = toOffset.clone().normalize();
  const cameraRotation = new Quaternion().setFromUnitVectors(fromDirection, toDirection);
  const direction = fromDirection.applyQuaternion(new Quaternion().slerp(cameraRotation, progress));
  const distance = MathUtils.lerp(fromOffset.length(), toOffset.length(), progress);
  const target = targetVector.toArray() as SceneView["target"];
  const position = targetVector.addScaledVector(direction, distance).toArray() as SceneView["position"];
  const interpolateOptional = (start?: number, end?: number) =>
    start === undefined ? end : end === undefined ? start : MathUtils.lerp(start, end, progress);

  return {
    projection: progress < 0.5 ? from.projection : to.projection,
    position,
    rotation: getCameraRotation(position, target),
    target,
    up: [0, 1, 0],
    fieldOfView: interpolateOptional(from.fieldOfView, to.fieldOfView),
    viewHeight: interpolateOptional(from.viewHeight, to.viewHeight),
    near: MathUtils.lerp(from.near, to.near, progress),
    far: MathUtils.lerp(from.far, to.far, progress),
  };
}

function getCameraRotation(position: SceneView["position"], target: SceneView["target"]): SceneView["rotation"] {
  // ScenePanel serializes camera orientation as ZYX Euler angles.
  const rotation = new Euler().setFromRotationMatrix(
    new Matrix4().lookAt(new Vector3(...position), new Vector3(...target), new Vector3(0, 1, 0)),
    "ZYX",
  );
  return [MathUtils.radToDeg(rotation.x), MathUtils.radToDeg(rotation.y), MathUtils.radToDeg(rotation.z)];
}
