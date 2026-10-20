import { fetch } from "@iiif/helpers";
import type { Manifest } from "@iiif/presentation-3";

/**
 * Fetches a IIIF resource and upgrades it to Presentation 3. The viewers only render manifests, so a URL that
 * resolves to anything else (e.g. a Collection) is rejected here instead of failing obscurely during render.
 */
export async function fetchManifest(url: string): Promise<Manifest> {
  const resource = await fetch(url);

  if (resource.type !== "Manifest") {
    throw new Error(`Expected a Manifest at ${url} but received a ${resource.type}`);
  }

  return resource;
}
