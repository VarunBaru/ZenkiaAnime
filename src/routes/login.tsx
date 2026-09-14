import { createFileRoute } from "@tanstack/react-router";
import { AuthForm } from "@/components/AuthForm";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Log in to AnimeHub" },
      {
        name: "description",
        content: "Log in to AnimeHub to reach your saved watchlist and episode progress.",
      },
      { property: "og:title", content: "Log in — AnimeHub" },
      { property: "og:description", content: "Reach your saved anime watchlist." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => <AuthForm initialMode="signin" />,
});
