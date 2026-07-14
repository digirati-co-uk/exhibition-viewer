import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/preview/leeds/full-page')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/preview/leeds/full-page"!</div>
}
