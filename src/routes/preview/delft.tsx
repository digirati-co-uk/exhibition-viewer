import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/preview/delft")({
  component: Outlet,
});
