import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { deleteAccount } from "@/lib/account.functions";
import { historyQuery, profileQuery, updateProfile, watchlistQuery } from "@/lib/library";
import { ThemeToggle } from "@/components/PreferenceControls";
import { BookMarked, History } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { usePreferences } from "@/lib/preferences";
import { EmptyState, ErrorState, PanelSkeleton } from "@/components/states";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "My profile — Zenkia Anime" },
      {
        name: "description",
        content: "Your Zenkia Anime profile, watch statistics and recent episode progress.",
      },
      { property: "og:title", content: "My profile — Zenkia Anime" },
      { property: "og:description", content: "Your display name, stats and viewing history." },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const profile = useQuery(profileQuery(user?.id));
  const list = useQuery(watchlistQuery(user?.id));
  const history = useQuery(historyQuery(user?.id));
  const {
    showHomeHistory,
    setShowHomeHistory,
    showHomeWatchlist,
    setShowHomeWatchlist,
  } = usePreferences();
  const metadataDisplayName = user?.user_metadata?.["display_name"] ?? null;
  const metadataAvatarUrl = user?.user_metadata?.["avatar_url"] ?? null;
  const [name, setName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");

  useEffect(() => {
    setName(metadataDisplayName ?? profile.data?.username ?? "");
    setAvatarUrl(metadataAvatarUrl ?? profile.data?.avatar_url ?? "");
  }, [metadataDisplayName, metadataAvatarUrl, profile.data]);

  const save = useMutation({
    mutationFn: () =>
      updateProfile(user!.id, { username: name.trim(), avatar_url: avatarUrl.trim() || null }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast.success("Profile updated");
    },
    onError: () => toast.error("Couldn't save your profile. Please try again."),
  });

  const deleteProfile = useMutation({
    mutationFn: () => deleteAccount(),
    onSuccess: async () => {
      await supabase.auth.signOut({ scope: "local" });
      queryClient.clear();
      toast.success("Your account and its data were permanently deleted");
      await navigate({ to: "/", replace: true });
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Couldn't delete your account."),
  });

  const counts = {
    saved: list.data?.length ?? 0,
    watching: list.data?.filter((r) => r.status === "watching").length ?? 0,
    completed: list.data?.filter((r) => r.status === "completed").length ?? 0,
    episodes: history.data?.reduce((sum, r) => sum + r.episodes_watched, 0) ?? 0,
  };

  return (
    <div className="mx-auto max-w-[1000px] px-4 py-8 sm:px-6">
      <h1 className="font-display text-3xl tracking-tight sm:text-4xl">Profile</h1>

      <section className="ink-panel mt-6 p-5">
        <p className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
          Signed in as
        </p>
        <p className="mt-1 font-display text-base break-all">{user?.email}</p>

        <div className="mt-5 flex items-center gap-4">
          <div className="grid size-16 shrink-0 place-items-center overflow-hidden border-2 border-border bg-muted font-display text-xl">
            {avatarUrl.trim() ? (
              <img
                src={avatarUrl}
                alt="Profile avatar preview"
                className="size-full object-cover"
              />
            ) : (
              (name.trim()[0] ?? user?.email?.[0] ?? "?").toUpperCase()
            )}
          </div>
          <div className="min-w-0 flex-1">
            <label
              htmlFor="displayName"
              className="block font-mono text-[10px] font-bold tracking-widest uppercase"
            >
              Display name
            </label>
            <input
              id="displayName"
              maxLength={40}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className="ink-panel-sm mt-1.5 w-full bg-card px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>

        <label
          htmlFor="avatarUrl"
          className="mt-5 block font-mono text-[10px] font-bold tracking-widest uppercase"
        >
          Avatar image URL
        </label>
        <div className="mt-1.5 flex flex-col gap-2 sm:flex-row">
          <input
            id="avatarUrl"
            type="url"
            value={avatarUrl}
            onChange={(e) => setAvatarUrl(e.target.value)}
            placeholder="https://example.com/avatar.jpg"
            className="ink-panel-sm w-full bg-card px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            onClick={() => save.mutate()}
            disabled={save.isPending || !name.trim()}
            className="ink-panel-sm ink-press shrink-0 bg-accent px-5 py-2.5 font-mono text-xs font-bold tracking-widest text-accent-foreground uppercase"
          >
            {save.isPending ? "Saving…" : "Save profile"}
          </button>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Use an image URL to customize your avatar. Leave it blank to use your initial.
        </p>
      </section>

      <section className="ink-panel mt-6 p-5">
        <div>
          <h2 className="font-display text-lg">Website theme</h2>
          <p className="mb-3 mt-1 text-xs text-muted-foreground">
            Choose light, dark, or match your device setting.
          </p>
          <ThemeToggle showText />
        </div>
      </section>

      <section className="ink-panel mt-6 p-5">
        <h2 className="font-display text-lg">Home screen</h2>
        <p className="mb-4 mt-1 text-xs text-muted-foreground">
          Choose which personal library sections appear on your home screen.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex cursor-pointer items-center gap-3 font-mono text-xs tracking-wide">
            <input
              type="checkbox"
              checked={showHomeWatchlist}
              onChange={(event) => setShowHomeWatchlist(event.target.checked)}
              className="size-4 accent-[var(--accent)]"
            />
            Show watchlist on home
          </label>
          <label className="flex cursor-pointer items-center gap-3 font-mono text-xs tracking-wide">
            <input
              type="checkbox"
              checked={showHomeHistory}
              onChange={(event) => setShowHomeHistory(event.target.checked)}
              className="size-4 accent-[var(--accent)]"
            />
            Show watch history on home
          </label>
        </div>
      </section>

      <section className="mt-6 grid gap-3 sm:grid-cols-2" aria-label="Your library">
        <Link
          to="/watchlist"
          className="ink-panel-sm ink-press flex items-center gap-4 bg-card p-4"
        >
          <BookMarked className="size-6 shrink-0 text-accent" strokeWidth={2.5} />
          <span className="min-w-0 flex-1">
            <span className="block font-display text-lg">My watchlist</span>
            <span className="mt-1 block font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
              {list.data?.length ?? 0} saved titles · Manage list
            </span>
          </span>
          <span aria-hidden="true" className="font-display text-xl">
            →
          </span>
        </Link>
        <Link to="/history" className="ink-panel-sm ink-press flex items-center gap-4 bg-card p-4">
          <History className="size-6 shrink-0 text-accent" strokeWidth={2.5} />
          <span className="min-w-0 flex-1">
            <span className="block font-display text-lg">Watch history</span>
            <span className="mt-1 block font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
              {history.data?.length ?? 0} episode records · View history
            </span>
          </span>
          <span aria-hidden="true" className="font-display text-xl">
            →
          </span>
        </Link>
      </section>

      <section className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Saved", value: counts.saved },
          { label: "Watching", value: counts.watching },
          { label: "Completed", value: counts.completed },
          { label: "Episodes", value: counts.episodes },
        ].map((stat) => (
          <div key={stat.label} className="ink-panel-sm halftone p-4 text-center">
            <p className="font-display text-2xl">{stat.value}</p>
            <p className="mt-1 font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
              {stat.label}
            </p>
          </div>
        ))}
      </section>

      <section className="mt-10">
        <h2 className="mb-4 font-display text-xl">Recently watched</h2>
        {history.isPending ? (
          <PanelSkeleton className="h-32 w-full" />
        ) : history.isError ? (
          <ErrorState
            message="Your history couldn't be loaded."
            onRetry={() => history.refetch()}
          />
        ) : history.data.length === 0 ? (
          <EmptyState
            title="No history yet"
            message="Mark an anime as watched from its details page and it will appear here."
            action={
              <Link
                to="/browse"
                search={{ genre: "", type: "", order: "popularity", page: 1 }}
                className="ink-panel-sm ink-press bg-accent px-5 py-2.5 font-mono text-xs font-bold tracking-widest text-accent-foreground uppercase"
              >
                Find something to watch
              </Link>
            }
          />
        ) : (
          <div className="ink-panel divide-y-2 divide-border">
            {history.data.map((row) => (
              <Link
                key={row.id}
                to="/anime/$animeId"
                params={{ animeId: String(row.mal_id) }}
                className="flex items-center gap-3 p-3 hover:bg-secondary"
              >
                {row.image_url ? (
                  <img
                    src={row.image_url}
                    alt={row.title}
                    loading="lazy"
                    className="aspect-2/3 w-12 shrink-0 border-2 border-border object-cover"
                  />
                ) : (
                  <div className="aspect-2/3 w-12 shrink-0 border-2 border-border bg-muted" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-display text-sm">{row.title}</p>
                  <p className="mt-1 font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
                    {row.episodes_watched} / {row.total_episodes ?? "?"} episodes
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="ink-panel mt-10 border-destructive p-5">
        <h2 className="font-display text-lg text-destructive">Delete account</h2>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          This permanently deletes your sign-in account, profile, watchlist, and watch history. You
          must have signed in within the last 15 minutes. You cannot undo this.
        </p>
        <button
          type="button"
          onClick={() => {
            if (
              window.confirm(
                "Permanently delete your account and all profile, watchlist, and history data? This cannot be undone.",
              )
            ) {
              deleteProfile.mutate();
            }
          }}
          disabled={deleteProfile.isPending}
          className="ink-panel-sm ink-press mt-4 bg-destructive px-4 py-2.5 font-mono text-xs font-bold tracking-widest text-destructive-foreground uppercase disabled:opacity-50"
        >
          {deleteProfile.isPending ? "Deleting…" : "Delete my account"}
        </button>
      </section>
    </div>
  );
}
