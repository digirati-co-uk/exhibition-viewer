import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/preview/delft/")({
  beforeLoad: ({ search }) => {
    throw redirect({ to: "/preview/delft/full-page", search });
  },
});
