import * as React from 'react'
import { Link, Outlet, createRootRoute } from '@tanstack/react-router'
import './preview/minimal.css';

export const Route = createRootRoute({
  component: RootComponent,
})

function RootComponent() {
  return (
    <React.Fragment>
      <div className="bg-black text-white p-2">
        <Link to="/">Exhibition Preview</Link>
      </div>
      <Outlet />
    </React.Fragment>
  )
}
