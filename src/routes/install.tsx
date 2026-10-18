import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Download, ExternalLink, MonitorDown, Smartphone } from "lucide-react";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export const Route = createFileRoute("/install")({
  head: () => ({
    meta: [
      { title: "Install Zenkia Anime" },
      {
        name: "description",
        content: "Install Zenkia Anime on your phone or computer, or download the Android and Windows apps.",
      },
    ],
  }),
  component: InstallPage,
});

function InstallPage() {
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const checkInstalled = () => {
      const standalone = window.matchMedia("(display-mode: standalone)").matches;
      const iosStandalone =
        (navigator as Navigator & { standalone?: boolean }).standalone === true;
      setInstalled(standalone || iosStandalone);
    };
    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setInstallPrompt(null);
    };

    checkInstalled();
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const installThisDevice = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  };

  return (
    <main className="mx-auto max-w-[1000px] space-y-8 px-4 py-8 sm:px-6 sm:py-12">
      <header className="ink-panel halftone p-6 sm:p-9">
        <p className="font-mono text-[10px] font-bold tracking-[0.25em] text-accent uppercase">
          Take Zenkia with you
        </p>
        <h1 className="mt-3 font-display text-3xl sm:text-5xl">Install Zenkia Anime</h1>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
          Add the site to your home screen or desktop for an app-like experience. Your account and
          library stay synced with the website.
        </p>
        <div className="mt-6">
          {installed ? (
            <p className="font-mono text-xs font-bold tracking-widest uppercase">
              Zenkia Anime is installed on this device.
            </p>
          ) : installPrompt ? (
            <button
              type="button"
              onClick={() => void installThisDevice()}
              className="ink-panel-sm ink-press inline-flex items-center gap-2 bg-accent px-5 py-3 font-mono text-xs font-bold tracking-widest text-accent-foreground uppercase"
            >
              <Download className="size-4" /> Install on this device
            </button>
          ) : (
            <p className="font-mono text-xs leading-6 text-muted-foreground">
              Use your browser menu and choose “Install app” or “Add to Home screen.”
            </p>
          )}
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-2">
        <article className="ink-panel p-5 sm:p-6">
          <Smartphone className="size-7 text-accent" />
          <h2 className="mt-3 font-display text-xl">Phone or tablet</h2>
          <ul className="mt-3 space-y-2 text-sm leading-6 text-muted-foreground">
            <li><strong className="text-foreground">Android:</strong> open this page in Chrome, then choose “Install app” from the browser menu.</li>
            <li><strong className="text-foreground">iPhone or iPad:</strong> open it in Safari, tap Share, then “Add to Home Screen.”</li>
          </ul>
        </article>

        <article className="ink-panel p-5 sm:p-6">
          <MonitorDown className="size-7 text-accent" />
          <h2 className="mt-3 font-display text-xl">Windows or Mac</h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            In Chrome or Edge, open the browser menu and choose “Install Zenkia Anime” or
            “Install this site as an app.” The install option appears when the browser supports it.
          </p>
        </article>
      </section>

      <section className="ink-panel p-5 sm:p-6">
        <h2 className="font-display text-xl">Permanent app downloads</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
          Download the latest Android APK or Windows Setup.exe. These links point to GitHub Releases
          and remain available after the build completes.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <a
            href="https://github.com/VarunBaru/ZenkiaAnime/releases/latest/download/ZenkiaAnime-Android.apk"
            className="ink-panel-sm ink-press inline-flex items-center gap-2 bg-accent px-4 py-2.5 font-mono text-[10px] font-bold tracking-widest text-accent-foreground uppercase"
          >
            <Download className="size-4" /> Android APK
          </a>
          <a
            href="https://github.com/VarunBaru/ZenkiaAnime/releases/latest/download/ZenkiaAnime-Windows-Setup.exe"
            className="ink-panel-sm ink-press inline-flex items-center gap-2 bg-accent px-4 py-2.5 font-mono text-[10px] font-bold tracking-widest text-accent-foreground uppercase"
          >
            <Download className="size-4" /> Windows Setup.exe
          </a>
          <a
            href="https://github.com/VarunBaru/ZenkiaAnime/releases"
            target="_blank"
            rel="noreferrer"
            className="ink-panel-sm ink-press inline-flex items-center gap-2 bg-card px-4 py-2.5 font-mono text-[10px] font-bold tracking-widest uppercase"
          >
            All releases <ExternalLink className="size-3.5" />
          </a>
        </div>
        <p className="mt-4 text-xs leading-5 text-muted-foreground">
          The APK is debug-signed, so replacing it with a future build may require uninstalling the
          old APK first. Windows may show a SmartScreen warning because its installer is unsigned.
        </p>
      </section>
    </main>
  );
}
