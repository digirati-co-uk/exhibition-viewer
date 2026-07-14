import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/preview/delft/full-page')({
  component: RouteComponent,
})

function RouteComponent() {
  // Essentially this configuration packed into a single URL that accepts a manifest URL and optional query parameters
  // http://localhost:5174/preview/delft?manifest=https%3A%2F%2Fheritage.tudelft.nl%2Fiiif%2Fmanifests%2Fnovieten%2Fmanifest.json&manifestEditorPreview=false&ignoreCanvasBackgrounds=false
  return <div>Hello "/preview/delft/full-page"!</div>
}
