import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Download, Monitor, Smartphone, ExternalLink } from "lucide-react";

export function DownloadsModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md border border-white/10 bg-[#12141a]/95 text-white backdrop-blur-2xl sm:rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold tracking-tight text-white">
            <Download className="size-5 text-[#E50914]" /> Download Zenkia Anime
          </DialogTitle>
          <DialogDescription className="text-xs text-white/60">
            Get the private test apps for desktop and mobile for a seamless viewing experience.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 space-y-3">
          <div className="flex items-start gap-3.5 rounded-xl border border-white/10 bg-white/5 p-3.5 transition-colors hover:bg-white/10">
            <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-white/10 text-white">
              <Monitor className="size-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-white">Windows Desktop App</p>
              <p className="mt-0.5 text-xs text-white/60">
                Electron desktop shell with Google SSO support and hardware acceleration.
              </p>
              <span className="mt-2 inline-flex items-center gap-1 rounded bg-[#E50914]/20 px-2 py-0.5 text-[10px] font-bold text-[#E50914]">
                ZenkiaAnime-Windows-Setup.exe
              </span>
            </div>
          </div>

          <div className="flex items-start gap-3.5 rounded-xl border border-white/10 bg-white/5 p-3.5 transition-colors hover:bg-white/10">
            <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-white/10 text-white">
              <Smartphone className="size-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-white">Android Mobile App</p>
              <p className="mt-0.5 text-xs text-white/60">
                Full-screen Android APK with custom tabs and mobile optimization.
              </p>
              <span className="mt-2 inline-flex items-center gap-1 rounded bg-[#E50914]/20 px-2 py-0.5 text-[10px] font-bold text-[#E50914]">
                ZenkiaAnime-Android.apk
              </span>
            </div>
          </div>
        </div>

        <div className="mt-2 rounded-lg bg-black/40 p-3 text-[11px] text-white/50">
          <p>
            Private builds are generated automatically via GitHub Actions. Connect to your Supabase
            account to sync watch history and watchlists across devices.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
