import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Heart } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import type { Anime } from "@/lib/jikan";
import { addFavorite, favoritesQuery, removeFavorite } from "@/lib/library";
import { Link } from "@tanstack/react-router";

export function FavoriteButton({ anime }: { anime: Anime }) {
  const { user } = useAuth();
  const client = useQueryClient();
  const [prompt, setPrompt] = useState(false);
  const { data = [] } = useQuery(favoritesQuery(user?.id));
  const saved = data.some((item) => item.mal_id === anime.mal_id);
  const mutation = useMutation({
    mutationFn: () =>
      user
        ? saved
          ? removeFavorite(user.id, anime.mal_id)
          : addFavorite(user.id, anime)
        : Promise.reject(new Error("Sign in to save favorites")),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ["favorites", user?.id] });
      toast.success(saved ? "Removed from favorites" : "Added to favorites");
    },
    onError: () => toast.error("Couldn't update favorites. Please try again."),
  });
  return (
    <>
      <button
        onClick={() => (user ? mutation.mutate() : setPrompt(true))}
        disabled={mutation.isPending}
        aria-label={saved ? "Remove from favorites" : "Add to favorites"}
        className={`ink-panel-sm ink-press inline-flex items-center gap-2 px-4 py-3 font-mono text-xs font-bold tracking-widest uppercase ${saved ? "text-rose-400" : "bg-card"}`}
      >
        <Heart className="size-4" fill={saved ? "currentColor" : "none"} />{" "}
        {saved ? "Favorited" : "Favorite"}
      </button>
      {prompt && (
        <div
          className="fixed inset-0 z-[100] grid place-items-center bg-black/60 p-4"
          onClick={() => setPrompt(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="ink-panel w-full max-w-md bg-card p-4 sm:p-6"
            onClick={(event) => event.stopPropagation()}
          >
            <p className="font-display text-xl">Sign in to save favorites</p>
            <div className="mt-4 flex gap-2">
              <Link
                to="/auth"
                className="ink-panel-sm bg-accent px-4 py-2 font-mono text-xs uppercase text-accent-foreground"
              >
                Sign in
              </Link>
              <button
                onClick={() => setPrompt(false)}
                className="ink-panel-sm px-4 py-2 font-mono text-xs uppercase"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
