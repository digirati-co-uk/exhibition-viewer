import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/preview/leeds/slideshow')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/preview/leeds/slideshow"!</div>
}
