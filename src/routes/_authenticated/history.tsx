import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { clearHistory, deleteHistoryEntry, historyQuery } from "@/lib/library";
import { HistoryCard } from "@/components/ContinueWatching";
import { EmptyState, ErrorState, PanelSkeleton } from "@/components/states";

export const Route = createFileRoute("/_authenticated/history")({
  head: () => ({
    meta: [
      { title: "Watch history — AnimeHub" },
      {
        name: "description",
        content: "Every episode you have opened on AnimeHub, ready to continue where you left off.",
      },
      { property: "og:title", content: "Watch history — AnimeHub" },
      {
        property: "og:description",
        content: "Your recently watched anime episodes with quick resume links.",
      },
    ],
  }),
  component: HistoryPage,
});

function HistoryPage() {
  const { user, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const history = useQuery(historyQuery(user?.id));
  const [confirmClear, setConfirmClear] = useState(false);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["history"] });

  const removeOne = useMutation({
    mutationFn: (id: string) => deleteHistoryEntry(user!.id, id),
    onSuccess: () => {
      invalidate();
      toast.success("Removed from your history");
    },
    onError: () => toast.error("Couldn't remove that entry. Please try again."),
  });

  const clearAll = useMutation({
    mutationFn: () => clearHistory(user!.id),
    onSuccess: () => {
      setConfirmClear(false);
      invalidate();
      toast.success("Watch history cleared");
    },
    onError: () => toast.error("Couldn't clear your history. Please try again."),
  });

  return (
    <div className="mx-auto max-w-[1100px] px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="font-display text-3xl tracking-tight sm:text-4xl">Watch history</h1>
        {(history.data?.length ?? 0) > 0 && (
          <button
            onClick={() => setConfirmClear(true)}
            className="ink-panel-sm ink-press bg-card px-4 py-2 font-mono text-[11px] font-bold tracking-widest uppercase"
          >
            Clear watch history
          </button>
        )}
      </div>

      {confirmClear && (
        <div className="ink-panel halftone mt-5 p-5">
          <p className="font-display text-lg">Clear your entire watch history?</p>
          <p className="mt-1 text-sm text-muted-foreground">
            This deletes every entry on your account. It can't be undone.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={() => clearAll.mutate()}
              disabled={clearAll.isPending}
              className="ink-panel-sm ink-press bg-accent px-4 py-2 font-mono text-[11px] font-bold tracking-widest text-accent-foreground uppercase"
            >
              {clearAll.isPending ? "Clearing…" : "Yes, clear it"}
            </button>
            <button
              onClick={() => setConfirmClear(false)}
              className="ink-panel-sm ink-press bg-card px-4 py-2 font-mono text-[11px] font-bold tracking-widest uppercase"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="mt-6">
        {authLoading || history.isPending ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <PanelSkeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        ) : history.isError ? (
          <ErrorState
            message={`Your watch history couldn't be loaded: ${history.error.message}`}
            onRetry={() => history.refetch()}
          />
        ) : history.data.length === 0 ? (
          <EmptyState
            title="No watch history yet"
            message="Open an episode and it will show up here so you can pick up where you left off."
            action={
              <Link
                to="/browse"
                search={{ genre: "", type: "", order: "popularity", page: 1 }}
                className="ink-panel-sm ink-press bg-accent px-5 py-2.5 font-mono text-xs font-bold tracking-widest text-accent-foreground uppercase"
              >
                Browse anime
              </Link>
            }
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {history.data.map((row) => (
              <HistoryCard
                key={row.id}
                row={row}
                actions={
                  <button
                    onClick={() => {
                      if (window.confirm(`Remove "${row.title}" from your history?`)) {
                        removeOne.mutate(row.id);
                      }
                    }}
                    disabled={removeOne.isPending}
                    className="ink-panel-sm ink-press bg-card px-3 py-1.5 font-mono text-[10px] font-bold tracking-widest uppercase"
                  >
                    Remove
                  </button>
                }
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

