import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Bookmark, BookmarkCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import type { Anime } from "@/lib/jikan";
import { addToWatchlist, removeFromWatchlist, watchlistQuery } from "@/lib/library";

export function WatchlistButton({ anime, compact = false }: { anime: Anime; compact?: boolean }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: list } = useQuery({ ...watchlistQuery(), enabled: Boolean(user) });
  const saved = Boolean(list?.some((row) => row.mal_id === anime.mal_id));

  const mutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("not-signed-in");
      if (saved) await removeFromWatchlist(user.id, anime.mal_id);
      else await addToWatchlist(user.id, anime);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["watchlist"] });
      toast.success(saved ? "Removed from your watchlist" : "Added to your watchlist");
    },
    onError: () => toast.error("Could not update your watchlist. Please try again."),
  });

  const handle = () => {
    if (!user) {
      toast.info("Sign in to save anime to your watchlist");
      navigate({ to: "/auth" });
      return;
    }
    mutation.mutate();
  };

  const Icon = mutation.isPending ? Loader2 : saved ? BookmarkCheck : Bookmark;

  if (compact) {
    return (
      <button
        onClick={handle}
        aria-label={saved ? "Remove from watchlist" : "Add to watchlist"}
        className={`ink-panel-sm shrink-0 p-1.5 transition-colors ${
          saved ? "bg-accent text-accent-foreground" : "bg-card hover:bg-secondary"
        }`}
      >
        <Icon className={`size-4 ${mutation.isPending ? "animate-spin" : ""}`} strokeWidth={2.5} />
      </button>
    );
  }

  return (
    <button
      onClick={handle}
      disabled={mutation.isPending}
      className={`ink-panel-sm ink-press inline-flex items-center gap-2 px-5 py-3 font-mono text-xs font-bold tracking-widest uppercase ${
        saved ? "bg-accent text-accent-foreground" : "bg-card"
      }`}
    >
      <Icon className={`size-4 ${mutation.isPending ? "animate-spin" : ""}`} strokeWidth={2.5} />
      {saved ? "In watchlist" : "Add to watchlist"}
    </button>
  );
}
