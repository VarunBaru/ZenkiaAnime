import { createFileRoute } from "@tanstack/react-router";
import { AuthForm } from "@/components/AuthForm";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "Create your AnimeHub account" },
      {
        name: "description",
        content: "Create a free AnimeHub account to build a watchlist and track anime you watch.",
      },
      { property: "og:title", content: "Create account — AnimeHub" },
      { property: "og:description", content: "Start building your anime watchlist." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => <AuthForm initialMode="signup" />,
});
