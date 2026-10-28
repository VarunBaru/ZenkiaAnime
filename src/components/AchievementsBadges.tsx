import { Lock } from "lucide-react";
import type { AchievementRow } from "@/lib/library";
import { PanelSkeleton } from "@/components/states";

type AchievementDef = {
  key: string;
  icon: string;
  name: string;
  description: string;
};

const ALL_ACHIEVEMENTS: AchievementDef[] = [
  {
    key: "first_watch",
    icon: "🎬",
    name: "First Watch",
    description: "Watch your very first episode.",
  },
  {
    key: "beginner",
    icon: "📺",
    name: "Anime Beginner",
    description: "Add 5 or more anime to your watchlist.",
  },
  {
    key: "binge_watcher",
    icon: "⚡",
    name: "Binge Watcher",
    description: "Watch episodes from 10 or more different anime.",
  },
  {
    key: "anime_master",
    icon: "👑",
    name: "Anime Master",
    description: "Watch episodes from 50 or more different anime.",
  },
  {
    key: "genre_explorer",
    icon: "🧭",
    name: "Genre Explorer",
    description: "Explore anime across many genres.",
  },
  {
    key: "completionist",
    icon: "✅",
    name: "Completionist",
    description: "Complete 10 or more anime series.",
  },
];

export function AchievementsBadges({
  achievements,
  isPending,
}: {
  achievements: AchievementRow[];
  isPending: boolean;
}) {
  if (isPending) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <PanelSkeleton key={i} className="h-28" />
          ))}
        </div>
      </div>
    );
  }

  const unlockedMap = new Map<string, AchievementRow>(achievements.map((a) => [a.key, a]));

  const unlocked = achievements
    .slice()
    .sort((a, b) => new Date(b.unlocked_at).getTime() - new Date(a.unlocked_at).getTime());

  return (
    <div className="space-y-8">
      {unlocked.length > 0 && (
        <div>
          <h3 className="mb-4 font-display text-lg">Recently Unlocked</h3>
          <div className="space-y-3">
            {unlocked.map((ach) => {
              const def = ALL_ACHIEVEMENTS.find((d) => d.key === ach.key);
              const icon = ach.icon ?? def?.icon ?? "🏆";
              const desc = ach.description ?? def?.description ?? "";
              const date = new Date(ach.unlocked_at).toLocaleDateString(undefined, {
                year: "numeric",
                month: "short",
                day: "numeric",
              });
              return (
                <div key={ach.id} className="ink-panel-sm flex items-center gap-4 bg-card p-4">
                  <span className="grid size-12 shrink-0 place-items-center border-2 border-accent bg-accent/10 text-2xl">
                    {icon}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-display text-sm">{ach.name}</p>
                    {desc && <p className="mt-0.5 text-xs text-muted-foreground">{desc}</p>}
                    <p className="mt-1 font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
                      Unlocked {date}
                    </p>
                  </div>
                  <span className="text-accent text-lg">✓</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div>
        <h3 className="mb-4 font-display text-lg">All Achievements</h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {ALL_ACHIEVEMENTS.map((def) => {
            const earned = unlockedMap.get(def.key);
            return (
              <div
                key={def.key}
                className={`ink-panel-sm flex flex-col items-center gap-2 p-4 text-center transition-opacity ${
                  earned ? "border-accent/40" : "opacity-50"
                }`}
              >
                <span className="relative text-3xl">
                  {def.icon}
                  {!earned && (
                    <span className="absolute -bottom-1 -right-1 grid size-4 place-items-center rounded-full bg-muted">
                      <Lock className="size-2.5 text-muted-foreground" />
                    </span>
                  )}
                </span>
                <p className="font-display text-xs leading-tight">{def.name}</p>
                <p className="text-[10px] text-muted-foreground leading-snug">{def.description}</p>
                {earned && (
                  <p className="font-mono text-[9px] tracking-widest text-accent uppercase">
                    Unlocked
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
