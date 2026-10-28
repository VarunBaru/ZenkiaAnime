import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AchievementsBadges } from "@/components/AchievementsBadges";
import { EmptyState, ErrorState, PanelSkeleton } from "@/components/states";

export const Route = createFileRoute("/profile/$userId")({ component: PublicProfilePage });

function PublicProfilePage() {
  const { userId } = Route.useParams();
  const profile = useQuery({
    queryKey: ["public-profile", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id,username,avatar_url,banner_url,bio,is_public,created_at")
        .eq("id", userId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  const favorites = useQuery({
    queryKey: ["public-favorites", userId],
    enabled: profile.data?.is_public === true,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("favorites")
        .select("id,mal_id,title,image_url,media_type,year,score,created_at,user_id")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
  const achievements = useQuery({
    queryKey: ["public-achievements", userId],
    enabled: profile.data?.is_public === true,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("achievements")
        .select("id,key,name,description,icon,unlocked_at,user_id")
        .eq("user_id", userId)
        .order("unlocked_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
  if (profile.isPending)
    return (
      <main className="mx-auto max-w-4xl px-4 py-10">
        <PanelSkeleton className="h-56" />
      </main>
    );
  if (profile.isError)
    return (
      <main className="mx-auto max-w-4xl px-4 py-10">
        <ErrorState
          message="This profile couldn't be loaded."
          onRetry={() => void profile.refetch()}
        />
      </main>
    );
  if (!profile.data?.is_public)
    return (
      <main className="mx-auto max-w-4xl px-4 py-16">
        <EmptyState
          title="Profile unavailable"
          message="This profile is private or doesn't exist."
        />
      </main>
    );
  const p = profile.data;
  return (
    <main className="mx-auto max-w-5xl space-y-8 px-4 py-8 sm:px-6">
      <section className="ink-panel overflow-hidden">
        <div
          className="h-40 bg-gradient-to-br from-accent/50 via-purple-500/30 to-blue-500/30"
          style={
            p.banner_url
              ? {
                  backgroundImage: `url(${p.banner_url})`,
                  backgroundPosition: "center",
                  backgroundSize: "cover",
                }
              : undefined
          }
        />
        <div className="relative -mt-12 flex flex-wrap items-end gap-4 px-5 pb-5 sm:-mt-16 sm:px-6">
          <div className="size-24 overflow-hidden border-4 border-card bg-muted sm:size-28">
            {p.avatar_url ? (
              <img src={p.avatar_url} alt="" className="size-full object-cover" />
            ) : (
              <div className="grid size-full place-items-center font-display text-3xl">
                {p.username?.[0]?.toUpperCase() ?? "A"}
              </div>
            )}
          </div>
          <div className="pb-1">
            <h1 className="font-display text-3xl">{p.username || "Anime Fan"}</h1>
            <p className="mt-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Zenkia member · Joined{" "}
              {new Date(p.created_at).toLocaleDateString(undefined, {
                year: "numeric",
                month: "short",
              })}
            </p>
          </div>
          {p.bio && <p className="w-full text-sm text-muted-foreground">{p.bio}</p>}
        </div>
      </section>
      <section>
        <h2 className="mb-4 font-display text-2xl">Favorite anime</h2>
        {favorites.isPending ? (
          <PanelSkeleton className="h-32" />
        ) : favorites.isError ? (
          <ErrorState
            message="Favorites couldn't be loaded."
            onRetry={() => void favorites.refetch()}
          />
        ) : favorites.data.length ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
            {favorites.data.map((item) => (
              <a
                key={item.id}
                href={`/anime/${item.mal_id}`}
                className="ink-panel-sm overflow-hidden bg-card"
              >
                <div className="aspect-2/3">
                  {item.image_url && (
                    <img
                      src={item.image_url}
                      alt={item.title}
                      loading="lazy"
                      className="size-full object-cover"
                    />
                  )}
                </div>
                <p className="line-clamp-2 p-2 font-display text-sm">{item.title}</p>
              </a>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No favorites shared"
            message="This user hasn't added any favorites yet."
          />
        )}
      </section>
      <section>
        <h2 className="mb-4 font-display text-2xl">Achievements</h2>
        <AchievementsBadges
          achievements={(achievements.data ?? []) as never[]}
          isPending={achievements.isPending}
        />
      </section>
    </main>
  );
}
