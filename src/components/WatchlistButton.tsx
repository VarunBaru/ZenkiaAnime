import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Bookmark, BookmarkCheck, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import type { Anime } from "@/lib/jikan";
import { addToWatchlist, removeFromWatchlist, watchlistQuery } from "@/lib/library";

function SignInPrompt({ onClose }: { onClose: () => void }) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Sign in to build your watchlist"
      className="fixed inset-0 z-[100] grid place-items-center bg-foreground/60 p-4"
      onClick={onClose}
    >
      <div
        className="ink-panel halftone w-full max-w-[420px] bg-card p-6 text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          aria-label="Close"
          className="ink-panel-sm ml-auto block bg-background p-1.5"
        >
          <X className="size-4" strokeWidth={3} />
        </button>
        <p className="mt-2 font-display text-2xl leading-tight tracking-tight uppercase">
          Sign in to build your watchlist
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Your saved anime follow you on every device.
        </p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <Link
            to="/login"
            className="ink-panel-sm ink-press bg-accent px-4 py-3 font-mono text-xs font-bold tracking-widest text-accent-foreground uppercase"
          >
            Sign in
          </Link>
          <Link
            to="/signup"
            className="ink-panel-sm ink-press bg-background px-4 py-3 font-mono text-xs font-bold tracking-widest uppercase"
          >
            Create account
          </Link>
        </div>
      </div>
    </div>
  );
}

export function WatchlistButton({ anime, compact = false }: { anime: Anime; compact?: boolean }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [prompt, setPrompt] = useState(false);

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
      setPrompt(true);
      return;
    }
    mutation.mutate();
  };

  const Icon = mutation.isPending ? Loader2 : saved ? BookmarkCheck : Bookmark;

  return (
    <>
      {compact ? (
        <button
          onClick={handle}
          aria-label={saved ? "Remove from watchlist" : "Add to watchlist"}
          className={`ink-panel-sm shrink-0 p-1.5 transition-colors ${
            saved ? "bg-accent text-accent-foreground" : "bg-card hover:bg-secondary"
          }`}
        >
          <Icon className={`size-4 ${mutation.isPending ? "animate-spin" : ""}`} strokeWidth={2.5} />
        </button>
      ) : (
        <button
          onClick={handle}
          disabled={mutation.isPending}
          className={`ink-panel-sm ink-press inline-flex items-center gap-2 px-5 py-3 font-mono text-xs font-bold tracking-widest uppercase ${
            saved ? "bg-accent text-accent-foreground" : "bg-card"
          }`}
        >
          <Icon className={`size-4 ${mutation.isPending ? "animate-spin" : ""}`} strokeWidth={2.5} />
          {saved ? "✓ In watchlist" : "Add to watchlist"}
        </button>
      )}
      {prompt && <SignInPrompt onClose={() => setPrompt(false)} />}
    </>
  );
}
