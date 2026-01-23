import * as React from 'react'
import { Link, Outlet, createRootRoute } from '@tanstack/react-router'
import './preview/minimal.css';

export const Route = createRootRoute({
  component: RootComponent,
})

function RootComponent() {
  return (
    <React.Fragment>
      <Outlet />
    </React.Fragment>
  )
}
