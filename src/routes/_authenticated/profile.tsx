import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { historyQuery, profileQuery, updateProfile, watchlistQuery } from "@/lib/library";
import { LanguageToggle, ThemeToggle } from "@/components/PreferenceControls";
import { EmptyState, ErrorState, PanelSkeleton } from "@/components/states";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "My profile — AnimeHub" },
      {
        name: "description",
        content: "Your AnimeHub profile, watch statistics and recent episode progress.",
      },
      { property: "og:title", content: "My profile — AnimeHub" },
      { property: "og:description", content: "Your display name, stats and viewing history." },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const profile = useQuery(profileQuery(user?.id));
  const list = useQuery(watchlistQuery());
  const history = useQuery(historyQuery(user?.id));
  const [name, setName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");

  useEffect(() => {
    if (profile.data) {
      setName(profile.data.username ?? "");
      setAvatarUrl(profile.data.avatar_url ?? "");
    }
  }, [profile.data?.username, profile.data?.avatar_url]);

  const save = useMutation({
    mutationFn: () => updateProfile(user!.id, { username: name.trim(), avatar_url: avatarUrl.trim() || null }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast.success("Profile updated");
    },
    onError: () => toast.error("Couldn't save your profile. Please try again."),
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
              <img src={avatarUrl} alt="Profile avatar preview" className="size-full object-cover" />
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

      <section className="ink-panel mt-6 grid gap-6 p-5 sm:grid-cols-2">
        <div>
          <h2 className="font-display text-lg">Anime language</h2>
          <p className="mb-3 mt-1 text-xs text-muted-foreground">
            Keep EN or JP selected for anime playback, just like before.
          </p>
          <LanguageToggle />
        </div>
        <div>
          <h2 className="font-display text-lg">Website theme</h2>
          <p className="mb-3 mt-1 text-xs text-muted-foreground">
            Choose light, dark, or match your device setting.
          </p>
          <ThemeToggle showText />
        </div>
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
    </div>
  );
}

