import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { ensureProfile, profileQuery } from "@/lib/library";

const TOUR_KEY = "zenkia:site-tour-complete:";
const TOUR_STEPS = [
  {
    title: "Find your next anime",
    body: "Use Browse to explore titles, or Search to look for a specific anime, studio, or tag.",
  },
  {
    title: "Build your watchlist",
    body: "Save anime to your watchlist and choose a status so you can keep your list organized.",
  },
  {
    title: "Keep your place",
    body: "Your episode history helps you continue watching. Visit Profile anytime to change your name, avatar, language, or theme.",
  },
];

export function OnboardingGate({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const queryClient = useQueryClient();
  const profile = useQuery(profileQuery(user?.id));
  const [step, setStep] = useState<"name" | "tour" | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [tourPage, setTourPage] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [doneForUser, setDoneForUser] = useState<string | null>(null);

  useEffect(() => {
    if (!user || (profile.isPending && !user.user_metadata?.["display_name"])) return;
    if (doneForUser === user.id) return;

    try {
      if (localStorage.getItem(`${TOUR_KEY}${user.id}`) === "1") {
        setDoneForUser(user.id);
        setStep(null);
        return;
      }
    } catch {
      // Continue with an in-memory completion state when storage is unavailable.
    }

    const name =
      user.user_metadata?.["display_name"]?.trim() || profile.data?.username?.trim() || "";
    const emailName = user.email?.split("@")[0]?.trim().toLocaleLowerCase();
    const isEmailPlaceholder = Boolean(emailName && name.toLocaleLowerCase() === emailName);
    setDisplayName(isEmailPlaceholder ? "" : name);
    setStep(name && !isEmailPlaceholder ? "tour" : "name");
  }, [user, profile.data, profile.isPending, profile.isError, doneForUser]);

  const saveName = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user || !displayName.trim() || saving) return;
    setSaving(true);
    setSaveError("");
    try {
      await ensureProfile(user.id, displayName.trim());
      await queryClient.invalidateQueries({ queryKey: ["profile", user.id] });
      setTourPage(0);
      setStep("tour");
    } catch (error) {
      setSaveError(
        error instanceof Error ? error.message : "Couldn't save your name. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  };

  const finishTour = () => {
    if (!user) return;
    try {
      localStorage.setItem(`${TOUR_KEY}${user.id}`, "1");
    } catch {
      // The in-memory state below still prevents this session from reopening it.
    }
    setDoneForUser(user.id);
    setStep(null);
  };

  const activeTourStep = TOUR_STEPS[tourPage] ?? TOUR_STEPS[0]!;

  return (
    <>
      {children}
      {!loading && user && step && (
        <div className="fixed inset-0 z-[100] grid place-items-center bg-background/90 p-4 backdrop-blur-sm">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="onboarding-title"
            className="ink-panel halftone max-h-[calc(100dvh-2rem)] w-full max-w-lg overflow-y-auto overscroll-contain p-4 shadow-2xl sm:p-8"
          >
            {step === "name" ? (
              <>
                <p className="font-mono text-[10px] font-bold tracking-[0.2em] text-accent uppercase">
                  Set up your profile · 1 of 2
                </p>
                <h1 id="onboarding-title" className="mt-3 font-display text-2xl sm:text-3xl">
                  What should we call you?
                </h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  Choose a display name to finish setting up your ZenkiaAnime profile.
                </p>
                <form onSubmit={saveName} className="mt-6">
                  <label
                    htmlFor="onboarding-name"
                    className="font-mono text-[10px] font-bold tracking-widest uppercase"
                  >
                    Display name
                  </label>
                  <input
                    id="onboarding-name"
                    autoFocus
                    required
                    maxLength={40}
                    value={displayName}
                    onChange={(event) => setDisplayName(event.target.value)}
                    className="ink-panel-sm mt-1.5 w-full bg-card px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                    placeholder="Your name"
                  />
                  {saveError && (
                    <p role="alert" className="mt-2 text-sm text-destructive">
                      {saveError}
                    </p>
                  )}
                  <button
                    type="submit"
                    disabled={saving || !displayName.trim()}
                    className="ink-panel-sm ink-press mt-4 w-full bg-accent px-4 py-3 font-mono text-xs font-bold tracking-widest text-accent-foreground uppercase disabled:opacity-50"
                  >
                    {saving ? "Saving…" : "Continue"}
                  </button>
                </form>
              </>
            ) : (
              <>
                <p className="font-mono text-[10px] font-bold tracking-[0.2em] text-accent uppercase">
                  Quick tour · {tourPage + 1} of {TOUR_STEPS.length}
                </p>
                <h1 id="onboarding-title" className="mt-3 font-display text-2xl sm:text-3xl">
                  {activeTourStep.title}
                </h1>
                <p className="mt-3 min-h-14 text-sm leading-6 text-muted-foreground">
                  {activeTourStep.body}
                </p>
                <div className="mt-7 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={finishTour}
                    className="px-2 py-2 font-mono text-[10px] font-bold tracking-widest text-muted-foreground uppercase underline underline-offset-4"
                  >
                    Skip tour
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      tourPage + 1 < TOUR_STEPS.length ? setTourPage(tourPage + 1) : finishTour()
                    }
                    className="ink-panel-sm ink-press bg-accent px-5 py-2.5 font-mono text-xs font-bold tracking-widest text-accent-foreground uppercase"
                  >
                    {tourPage + 1 < TOUR_STEPS.length ? "Next" : "Start exploring"}
                  </button>
                </div>
              </>
            )}
          </section>
        </div>
      )}
    </>
  );
}
