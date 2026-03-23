import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/packages/new")({
  beforeLoad: () => {
    throw redirect({ to: "/plugins/new" });
  },
});
