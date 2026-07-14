import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/preview/leeds/slideshow')({
  component: RouteComponent,
})

function RouteComponent() {
  // https://leedsunilibrary.exhibitionviewer.org/iiif/marie-hartley.json
  // This should look pretty much the same (minus the header) as the /leeds-exhibition folder page.
  return <div>Hello "/preview/leeds/slideshow"!</div>
}
