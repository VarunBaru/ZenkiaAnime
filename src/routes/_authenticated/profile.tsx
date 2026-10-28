import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { deleteAccount } from "@/lib/account.functions";
import {
  achievementsQuery,
  addFavorite,
  addFavoriteToWatchlist,
  awardAchievement,
  favoritesQuery,
  historyQuery,
  latestPerAnime,
  profileQuery,
  removeFavorite,
  removeFromWatchlist,
  setWatchlistStatus,
  updateProfileSettings,
  watchlistQuery,
} from "@/lib/library";
import { supabase } from "@/integrations/supabase/client";
import { ProfileHeader } from "@/components/ProfileHeader";
import { ProfileFinder } from "@/components/ProfileFinder";
import { EditProfileModal } from "@/components/EditProfileModal";
import { StatsDashboard } from "@/components/StatsDashboard";
import { AchievementsBadges } from "@/components/AchievementsBadges";
import { AnimeLibraryGrid, type LibrarySection } from "@/components/AnimeLibraryGrid";
import { EmptyState, ErrorState, PanelSkeleton } from "@/components/states";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Play, Settings, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({ meta: [{ title: "My profile — Zenkia Anime" }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const profile = useQuery(profileQuery(user?.id));
  const list = useQuery(watchlistQuery(user?.id));
  const history = useQuery(historyQuery(user?.id));
  const favorites = useQuery(favoritesQuery(user?.id));
  const achievements = useQuery(achievementsQuery(user?.id));
  const [editOpen, setEditOpen] = useState(false);
  const [section, setSection] = useState<LibrarySection>("watching");
  const rows = list.data ?? [];
  const favoriteRows = favorites.data ?? [];
  const latest = useMemo(() => latestPerAnime(history.data ?? []), [history.data]);

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["watchlist", user?.id] });
    void queryClient.invalidateQueries({ queryKey: ["favorites", user?.id] });
    void queryClient.invalidateQueries({ queryKey: ["history", user?.id] });
    void queryClient.invalidateQueries({ queryKey: ["achievements", user?.id] });
  };
  const remove = useMutation({
    mutationFn: (malId: number) => removeFromWatchlist(user!.id, malId),
    onSuccess: refresh,
    onError: () => toast.error("Couldn't update your library."),
  });
  const status = useMutation({
    mutationFn: ({ malId, next }: { malId: number; next: import("@/lib/library").WatchStatus }) =>
      setWatchlistStatus(user!.id, malId, next),
    onSuccess: refresh,
    onError: () => toast.error("Could not update status."),
  });
  const favorite = useMutation({
    mutationFn: async (malId: number) => {
      const existing = favoriteRows.find((row) => row.mal_id === malId);
      if (existing) return removeFavorite(user!.id, malId);
      const item = rows.find((row) => row.mal_id === malId);
      if (!item) throw new Error("Anime details are unavailable");
      return addFavorite(user!.id, {
        mal_id: item.mal_id,
        title: item.title,
        title_english: item.title,
        episodes: null,
        images: { jpg: { image_url: item.image_url ?? "" } },
        type: item.media_type,
        year: item.year,
        score: item.score,
      } as Parameters<typeof addFavorite>[1]);
    },
    onSuccess: refresh,
    onError: () => toast.error("Couldn't update favorites."),
  });

  useEffect(() => {
    if (!user || !list.data || !history.data) return;
    void awardAchievement(user.id)
      .then(() => queryClient.invalidateQueries({ queryKey: ["achievements", user.id] }))
      .catch(() => undefined);
  }, [user, list.data, history.data, queryClient]);

  const isLoading = list.isPending || history.isPending || favorites.isPending;
  const hasError = list.isError || history.isError || favorites.isError;

  return (
    <div className="mx-auto max-w-[1100px] space-y-8 px-4 py-8 sm:px-6">
      <ProfileHeader profile={profile.data ?? null} onEdit={() => setEditOpen(true)} />
      <EditProfileModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        profile={profile.data ?? null}
      />

      <ProfileFinder />

      <section>
        <SectionTitle title="Your anime stats" />
        {hasError ? (
          <ErrorState message="Some profile data couldn't be loaded." onRetry={refresh} />
        ) : (
          <StatsDashboard
            watchlist={rows}
            history={history.data ?? []}
            favorites={favoriteRows}
            isPending={isLoading}
          />
        )}
      </section>

      <section>
        <SectionTitle title="My anime library" />
        <Tabs value={section} onValueChange={(value) => setSection(value as LibrarySection)}>
          <TabsList className="mb-4 flex h-auto flex-wrap justify-start gap-2 bg-transparent p-0 sm:gap-3">
            {(
              [
                "watching",
                "completed",
                "planned",
                "on_hold",
                "dropped",
                "favorites",
              ] as LibrarySection[]
            ).map((item) => (
              <TabsTrigger
                key={item}
                value={item}
                className="ink-panel-sm rounded-none border border-border bg-card px-3 py-2 font-mono text-[10px] uppercase data-[state=active]:bg-accent data-[state=active]:text-accent-foreground data-[state=active]:shadow-none"
              >
                {item === "on_hold"
                  ? "On hold"
                  : item === "planned"
                    ? "Plan to watch"
                    : item === "watching"
                      ? "Watching"
                      : item}
              </TabsTrigger>
            ))}
          </TabsList>
          <TabsContent value={section}>
            {hasError ? (
              <ErrorState message="Your library couldn't be loaded." onRetry={refresh} />
            ) : (
              <AnimeLibraryGrid
                section={section}
                rows={rows}
                favorites={new Set(favoriteRows.map((row) => row.mal_id))}
                history={history.data ?? []}
                isPending={isLoading}
                onRemove={(id) =>
                  section === "favorites" ? favorite.mutate(id) : remove.mutate(id)
                }
                onToggleFavorite={(id) => favorite.mutate(id)}
                onStatus={(id, next) => {
                  if (rows.some((row) => row.mal_id === id)) status.mutate({ malId: id, next });
                  else {
                    const item = favoriteRows.find((row) => row.mal_id === id);
                    if (item && user)
                      void addFavoriteToWatchlist(user.id, item, next)
                        .then(refresh)
                        .catch(() => toast.error("Could not add anime to your library."));
                  }
                }}
              />
            )}
          </TabsContent>
        </Tabs>
      </section>

      <section>
        <SectionTitle title="Continue watching" />
        {history.isPending ? (
          <PanelSkeleton className="h-28" />
        ) : history.isError ? (
          <ErrorState
            message="Viewing activity couldn't be loaded."
            onRetry={() => void history.refetch()}
          />
        ) : latest.length === 0 ? (
          <EmptyState
            title="No viewing activity yet"
            message="Your real episode progress will appear here when you watch through the Zenkia player."
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {latest.map((row) => {
              const episode = row.episode_number ?? 1;
              const percent = Math.max(0, Math.min(100, row.progress_percent ?? 0));
              return (
                <article key={row.mal_id} className="ink-panel-sm flex gap-3 bg-card p-3">
                  {row.image_url && (
                    <img src={row.image_url} alt="" className="aspect-2/3 w-14 object-cover" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 font-display">{row.title}</p>
                    <p className="mt-1 font-mono text-[10px] text-muted-foreground">
                      Episode {episode}
                      {row.total_episodes ? ` / ${row.total_episodes}` : ""}
                    </p>
                    <div className="mt-2 h-1.5 bg-muted">
                      <div className="h-full bg-accent" style={{ width: `${percent}%` }} />
                    </div>
                    <Link
                      to="/watch/$animeId/$episodeNumber"
                      params={{ animeId: String(row.mal_id), episodeNumber: String(episode) }}
                      className="mt-3 inline-flex items-center gap-1 font-mono text-[10px] uppercase text-accent"
                    >
                      <Play className="size-3" /> Resume
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section>
        <SectionTitle title="Achievements" />
        <AchievementsBadges
          achievements={achievements.data ?? []}
          isPending={achievements.isPending}
        />
      </section>

      <DangerZone
        onSignOut={() => leaveProfile({ to: "/auth", replace: true })}
        onSignUp={() => leaveProfile({ to: "/signup", replace: true })}
        onDelete={async () => {
          try {
            await deleteAccount();
            await supabase.auth.signOut({ scope: "local" });
            queryClient.clear();
            toast.success("Your account and its data were permanently deleted");
            await navigate({ to: "/", replace: true });
          } catch (error) {
            toast.error(error instanceof Error ? error.message : "Couldn't delete your account.");
          }
        }}
      />
    </div>
  );

  async function leaveProfile(destination: { to: "/auth" | "/signup"; replace: true }) {
    const { error } = await supabase.auth.signOut({ scope: "local" });
    if (error) {
      toast.error("Unable to sign out. Please try again.");
      return;
    }
    queryClient.clear();
    await navigate(destination);
  }
}

function SectionTitle({ title }: { title: string }) {
  return <h2 className="mb-4 font-display text-xl sm:text-2xl">{title}</h2>;
}
function DangerZone({
  onDelete,
  onSignOut,
  onSignUp,
}: {
  onDelete: () => void;
  onSignOut: () => void;
  onSignUp: () => void;
}) {
  return (
    <details className="ink-panel p-4">
      <summary className="flex cursor-pointer items-center gap-2 font-display">
        <Settings className="size-4" /> Account settings
      </summary>
      <p className="mt-3 text-sm text-muted-foreground">
        Manage account privacy and profile details using Edit profile above.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          onClick={onSignOut}
          className="ink-panel-sm ink-press bg-card px-4 py-2 font-mono text-[10px] font-bold tracking-widest uppercase"
        >
          Sign out
        </button>
        <button
          onClick={onSignUp}
          className="ink-panel-sm ink-press bg-accent px-4 py-2 font-mono text-[10px] font-bold tracking-widest text-accent-foreground uppercase"
        >
          Sign up
        </button>
      </div>
      <button
        onClick={() => {
          if (window.confirm("Permanently delete your account and data? This cannot be undone."))
            onDelete();
        }}
        className="mt-4 inline-flex items-center gap-2 text-sm text-destructive"
      >
        <Trash2 className="size-4" /> Delete account
      </button>
    </details>
  );
}
