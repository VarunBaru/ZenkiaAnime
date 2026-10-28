import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Edit2, Heart, Globe, Lock, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { usePreferences } from "@/lib/preferences";

export function ProfileHeader({
  profile,
  onEdit,
}: {
  profile: {
    id: string;
    username: string | null;
    avatar_url: string | null;
    banner_url: string | null;
    bio: string | null;
    is_public: boolean;
    created_at: string;
  } | null;
  onEdit: () => void;
}) {
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);
  const username = profile?.username || user?.user_metadata?.["display_name"] || "Anime Fan";
  const avatarUrl = profile?.avatar_url || user?.user_metadata?.["avatar_url"] || null;
  const bannerUrl = profile?.banner_url || null;
  const bio = profile?.bio || null;
  const isPublic = profile?.is_public ?? false;
  const joinDate = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : null;

  const copyLink = () => {
    const url = `${window.location.origin}/profile/${profile?.id}`;
    void navigator.clipboard
      .writeText(url)
      .then(() => {
        setCopied(true);
        toast.success("Profile link copied");
      })
      .catch(() => toast.error("Could not copy link"));
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="ink-panel overflow-hidden">
      <div
        className="relative h-40 sm:h-56 bg-gradient-to-br from-accent/40 via-purple-500/30 to-blue-500/20"
        style={
          bannerUrl
            ? {
                backgroundImage: `url(${bannerUrl})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }
            : undefined
        }
      >
        <div className="absolute inset-0 bg-black/40" />
        <div className="absolute top-4 right-4 flex items-center gap-2">
          <button
            onClick={onEdit}
            className="ink-panel-sm ink-press bg-card/90 px-3 py-1.5 font-mono text-[10px] font-bold tracking-widest uppercase"
          >
            <Edit2 className="mr-1 inline size-3" /> Edit profile
          </button>
        </div>
      </div>

      <div className="relative -mt-12 px-5 pb-5 sm:-mt-16 sm:px-6">
        <div className="flex flex-wrap items-end gap-4">
          <div className="relative size-24 shrink-0 sm:size-28">
            <div className="size-full overflow-hidden border-4 border-card bg-muted">
              {avatarUrl ? (
                <img src={avatarUrl} alt={username} className="size-full object-cover" />
              ) : (
                <div className="grid size-full place-items-center font-display text-3xl">
                  {username[0]?.toUpperCase() ?? "?"}
                </div>
              )}
            </div>
            <span
              aria-label={isPublic ? "Public profile" : "Private profile"}
              title={isPublic ? "Public profile" : "Private profile"}
              className={`absolute -top-1 -left-1 inline-flex size-7 items-center justify-center ${
                isPublic
                  ? "text-emerald-400"
                  : "text-muted-foreground"
              }`}
            >
              {isPublic ? <Globe className="size-4" /> : <Lock className="size-4" />}
            </span>
          </div>
          <div className="min-w-0 flex-1 pb-1">
            <h1 className="break-words font-display text-2xl sm:text-3xl [overflow-wrap:anywhere]">{username}</h1>
            <p className="mt-1 font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
              ID: {profile?.id.slice(0, 8)}…{joinDate ? ` · Joined ${joinDate}` : ""}
            </p>
          </div>
        </div>

        {bio && <p className="mt-3 max-w-3xl break-words text-sm text-muted-foreground">{bio}</p>}

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            onClick={copyLink}
            className="ink-panel-sm ink-press inline-flex items-center gap-1.5 bg-card px-3 py-1.5 font-mono text-[10px] font-bold tracking-widest uppercase"
          >
            {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
            Copy profile link
          </button>
          <a
            href="#my-anime-library"
            className="ink-panel-sm ink-press bg-accent px-4 py-1.5 font-mono text-[10px] font-bold tracking-widest text-accent-foreground uppercase"
          >
            <Heart className="mr-1 inline size-3" /> My library
          </a>
        </div>
      </div>
    </div>
  );
}
