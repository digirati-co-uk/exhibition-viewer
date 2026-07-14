import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/preview/leeds/scroll')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/preview/leeds/scroll"!</div>
}
