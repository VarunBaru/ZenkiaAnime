import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { LogOut } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { ThemeToggle } from "@/components/PreferenceControls";
import { updateProfile, updateProfileSettings } from "@/lib/library";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "@tanstack/react-router";

type FullProfile = {
  id: string;
  username: string | null;
  avatar_url: string | null;
  banner_url: string | null;
  bio: string | null;
  is_public: boolean;
  created_at: string;
};

export function EditProfileModal({
  open,
  onClose,
  profile,
}: {
  open: boolean;
  onClose: () => void;
  profile: FullProfile | null | undefined;
}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [bannerUrl, setBannerUrl] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [uploading, setUploading] = useState(false);

  const uploadMedia = async (file: File, kind: "avatar" | "banner") => {
    if (!user) return;
    if (!file.type.startsWith("image/") || file.size > 5 * 1024 * 1024) {
      toast.error("Choose an image smaller than 5 MB.");
      return;
    }
    setUploading(true);
    try {
      const extension =
        file.name
          .split(".")
          .pop()
          ?.replace(/[^a-z0-9]/gi, "") || "jpg";
      const path = `${user.id}/${kind}-${Date.now()}.${extension}`;
      const { error } = await supabase.storage
        .from("profile-media")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (error) throw error;
      const { data } = supabase.storage.from("profile-media").getPublicUrl(path);
      if (kind === "avatar") setAvatarUrl(data.publicUrl);
      else setBannerUrl(data.publicUrl);
      toast.success(`${kind === "avatar" ? "Avatar" : "Banner"} uploaded`);
    } catch {
      toast.error("Upload failed. Check that the profile-media bucket migration is applied.");
    } finally {
      setUploading(false);
    }
  };

  useEffect(() => {
    if (profile) {
      setUsername(profile.username ?? user?.user_metadata?.["display_name"] ?? "");
      setBio(profile.bio ?? "");
      setAvatarUrl(profile.avatar_url ?? "");
      setBannerUrl(profile.banner_url ?? "");
      setIsPublic(profile.is_public ?? false);
    }
  }, [profile, user]);

  const profileMutation = useMutation({
    mutationFn: () =>
      updateProfile(user!.id, {
        username: username.trim(),
        avatar_url: avatarUrl.trim() || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast.success("Profile saved");
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Couldn't save profile"),
  });

  const settingsMutation = useMutation({
    mutationFn: () =>
      updateProfileSettings(user!.id, {
        bio: bio.trim() || null,
        banner_url: bannerUrl.trim() || null,
        is_public: isPublic,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast.success("Settings saved");
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Couldn't save settings"),
  });

  const handleSaveInfo = () => {
    profileMutation.mutate();
    settingsMutation.mutate();
  };

  const handleSaveBanner = () => {
    profileMutation.mutate();
    settingsMutation.mutate();
  };

  const handleSignOut = async () => {
    onClose();
    await supabase.auth.signOut({ scope: "local" });
    queryClient.clear();
    void navigate({ to: "/", replace: true });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <DialogContent className="max-w-lg rounded-none border-2 border-border bg-background p-0 sm:rounded-none">
        <DialogHeader className="border-b-2 border-border py-5 pr-10 pl-4 sm:px-6">
          <DialogTitle className="font-display text-xl">Edit Profile</DialogTitle>
          <DialogDescription className="font-mono text-[10px] tracking-widest uppercase text-muted-foreground">
            Customize your public profile and preferences
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="info" className="w-full">
          <TabsList className="flex h-auto w-full flex-wrap justify-start rounded-none border-b-2 border-border bg-transparent p-0">
            {(["info", "media", "settings"] as const).map((tab) => (
              <TabsTrigger
                key={tab}
                value={tab}
                className="min-w-0 flex-1 rounded-none border-b-2 border-transparent px-2 py-3 font-mono text-[9px] font-bold leading-tight tracking-wider uppercase data-[state=active]:border-accent data-[state=active]:bg-transparent data-[state=active]:text-accent data-[state=active]:shadow-none"
              >
                {tab === "info"
                  ? "Profile Info"
                  : tab === "media"
                    ? "Banner & Avatar"
                    : "Privacy & Settings"}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Profile Info */}
          <TabsContent value="info" className="m-0 space-y-5 p-4 sm:p-6">
            <div>
              <label className="block font-mono text-[10px] font-bold tracking-widest uppercase mb-1.5">
                Display name <span className="text-muted-foreground">({username.length}/40)</span>
              </label>
              <input
                maxLength={40}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Your display name"
                className="ink-panel-sm w-full bg-card px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="block font-mono text-[10px] font-bold tracking-widest uppercase mb-1.5">
                Bio <span className="text-muted-foreground">({bio.length}/500)</span>
              </label>
              <textarea
                maxLength={500}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell us about yourself…"
                rows={4}
                className="ink-panel-sm w-full bg-card px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring resize-none"
              />
            </div>
            <button
              onClick={handleSaveInfo}
              disabled={profileMutation.isPending || settingsMutation.isPending || !username.trim()}
              className="ink-panel-sm ink-press w-full bg-accent py-2.5 font-mono text-xs font-bold tracking-widest text-accent-foreground uppercase disabled:opacity-50"
            >
              {profileMutation.isPending || settingsMutation.isPending
                ? "Saving…"
                : "Save profile info"}
            </button>
          </TabsContent>

          {/* Banner & Avatar */}
          <TabsContent value="media" className="m-0 space-y-5 p-4 sm:p-6">
            <div>
              <label className="block font-mono text-[10px] font-bold tracking-widest uppercase mb-1.5">
                Avatar URL (https only)
              </label>
              <input
                type="file"
                accept="image/*"
                disabled={uploading}
                onChange={(e) => {
                  const file = e.currentTarget.files?.[0];
                  if (file) void uploadMedia(file, "avatar");
                }}
                className="mb-2 block w-full text-xs"
              />
              <input
                type="url"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="https://example.com/avatar.jpg"
                className="ink-panel-sm w-full bg-card px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
              {avatarUrl.trim() && (
                <div className="mt-3 flex items-center gap-3">
                  <span className="font-mono text-[10px] tracking-widest uppercase text-muted-foreground">
                    Preview:
                  </span>
                  <img
                    src={avatarUrl}
                    alt="Avatar preview"
                    className="size-14 border-2 border-border object-cover"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.display = "none";
                    }}
                  />
                </div>
              )}
            </div>
            <div>
              <label className="block font-mono text-[10px] font-bold tracking-widest uppercase mb-1.5">
                Banner URL (https only)
              </label>
              <input
                type="file"
                accept="image/*"
                disabled={uploading}
                onChange={(e) => {
                  const file = e.currentTarget.files?.[0];
                  if (file) void uploadMedia(file, "banner");
                }}
                className="mb-2 block w-full text-xs"
              />
              <input
                type="url"
                value={bannerUrl}
                onChange={(e) => setBannerUrl(e.target.value)}
                placeholder="https://example.com/banner.jpg"
                className="ink-panel-sm w-full bg-card px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
              {bannerUrl.trim() && (
                <div className="mt-3">
                  <span className="font-mono text-[10px] tracking-widest uppercase text-muted-foreground">
                    Preview:
                  </span>
                  <img
                    src={bannerUrl}
                    alt="Banner preview"
                    className="mt-2 h-24 w-full border-2 border-border object-cover"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.display = "none";
                    }}
                  />
                </div>
              )}
            </div>
            <button
              onClick={handleSaveBanner}
              disabled={settingsMutation.isPending}
              className="ink-panel-sm ink-press w-full bg-accent py-2.5 font-mono text-xs font-bold tracking-widest text-accent-foreground uppercase disabled:opacity-50"
            >
              {settingsMutation.isPending || profileMutation.isPending ? "Saving…" : "Save media"}
            </button>
          </TabsContent>

          {/* Privacy & Settings */}
          <TabsContent value="settings" className="m-0 space-y-6 p-4 sm:p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-mono text-xs font-bold tracking-widest uppercase">
                  Public profile
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Allow others to view your profile page.
                </p>
              </div>
              <Switch
                checked={isPublic}
                onCheckedChange={(v) => {
                  setIsPublic(v);
                  updateProfileSettings(user!.id, { is_public: v })
                    .then(() => {
                      queryClient.invalidateQueries({ queryKey: ["profile"] });
                    })
                    .catch(() => toast.error("Couldn't update privacy setting"));
                }}
              />
            </div>

            <div>
              <p className="mb-2 font-mono text-xs font-bold tracking-widest uppercase">Theme</p>
              <ThemeToggle showText />
            </div>

            <div className="border-t-2 border-border pt-4">
              <button
                onClick={handleSignOut}
                className="ink-panel-sm ink-press flex w-full items-center justify-center gap-2 bg-card py-2.5 font-mono text-xs font-bold tracking-widest uppercase hover:bg-destructive/10 hover:text-destructive"
              >
                <LogOut className="size-4" />
                Sign out
              </button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
