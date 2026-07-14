import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/preview/delft/scroll')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/preview/delft/scroll"!</div>
}
