import { createFileRoute } from "@tanstack/react-router";
import { AuthForm } from "@/components/AuthForm";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in or create your AnimeHub account" },
      {
        name: "description",
        content:
          "Sign in to AnimeHub to save anime to your watchlist and track the episodes you've watched.",
      },
      { property: "og:title", content: "Sign in — AnimeHub" },
      { property: "og:description", content: "Save your watchlist and track episode progress." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => <AuthForm initialMode="signin" />,
});
