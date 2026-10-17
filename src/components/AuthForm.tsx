import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ensureProfile } from "@/lib/library";

function friendly(message: string) {
  const m = message.toLowerCase();
  if (m.includes("invalid login")) return "Wrong email or password — try again.";
  if (m.includes("already registered") || m.includes("already been registered"))
    return "That email already has an account. Sign in instead.";
  if (m.includes("email not confirmed")) return "Confirm your email first, then sign in.";
  if (m.includes("password")) return "That password won't work — use at least 6 characters.";
  if (m.includes("fetch") || m.includes("network"))
    return "Can't reach the server. Check your connection.";
  return message || "Something went wrong. Please try again.";
}

export function AuthForm({ initialMode = "signin" }: { initialMode?: "signin" | "signup" }) {
  const [mode, setMode] = useState<"signin" | "signup">(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => setMode(initialMode), [initialMode]);

  useEffect(() => {
    if (!loading && user) navigate({ to: "/watchlist", replace: true });
  }, [user, loading, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        if (data.user && data.session) {
          await ensureProfile(data.user.id, null);
          toast.success("Welcome to AnimeHub!");
          navigate({ to: "/watchlist" });
        } else {
          toast.success("Check your inbox to confirm your email, then sign in.");
          setMode("signin");
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        if (data.user) await ensureProfile(data.user.id);
        toast.success("Signed in");
        navigate({ to: "/watchlist" });
      }
    } catch (error) {
      toast.error(friendly(error instanceof Error ? error.message : ""));
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: window.location.origin },
      });
      if (error) throw error;
    } catch (error) {
      setBusy(false);
      toast.error(friendly(error instanceof Error ? error.message : ""));
    }
  };

  return (
    <div className="relative isolate overflow-hidden bg-background px-4 py-10 sm:px-6 sm:py-14">
      <svg
        aria-hidden="true"
        viewBox="0 0 460 340"
        fill="none"
        className="pointer-events-none absolute -top-8 -right-20 z-0 h-64 w-80 text-accent/35 sm:h-80 sm:w-[460px]"
      >
        <path
          d="M452 16C362 56 360 117 292 143c-71 27-101 7-151 54C98 236 65 288 13 322M348 105c-9-42-3-65 19-90m-89 137c-40-8-61-25-76-57m25 71c-5 39-25 62-58 81m153-101c28-1 49-13 70-39"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <g fill="currentColor">
          <ellipse cx="359" cy="37" rx="10" ry="6" transform="rotate(-46 359 37)" />
          <ellipse cx="373" cy="40" rx="10" ry="6" transform="rotate(26 373 40)" />
          <ellipse cx="365" cy="53" rx="10" ry="6" transform="rotate(82 365 53)" />
          <ellipse cx="350" cy="50" rx="10" ry="6" transform="rotate(138 350 50)" />
          <ellipse cx="347" cy="36" rx="10" ry="6" transform="rotate(195 347 36)" />
          <circle cx="360" cy="43" r="4" fill="#ffd166" />
          <ellipse cx="183" cy="100" rx="9" ry="5" transform="rotate(-30 183 100)" />
          <ellipse cx="194" cy="105" rx="9" ry="5" transform="rotate(42 194 105)" />
          <ellipse cx="187" cy="117" rx="9" ry="5" transform="rotate(100 187 117)" />
          <ellipse cx="174" cy="111" rx="9" ry="5" transform="rotate(160 174 111)" />
          <ellipse cx="174" cy="98" rx="9" ry="5" transform="rotate(220 174 98)" />
          <circle cx="184" cy="105" r="3.5" fill="#ffd166" />
          <ellipse cx="293" cy="143" rx="9" ry="5" transform="rotate(-25 293 143)" />
          <ellipse cx="304" cy="149" rx="9" ry="5" transform="rotate(45 304 149)" />
          <ellipse cx="297" cy="160" rx="9" ry="5" transform="rotate(100 297 160)" />
          <ellipse cx="284" cy="154" rx="9" ry="5" transform="rotate(160 284 154)" />
          <ellipse cx="284" cy="141" rx="9" ry="5" transform="rotate(220 284 141)" />
          <circle cx="294" cy="148" r="3.5" fill="#ffd166" />
        </g>
        <path d="M64 93c13 9 16 17 12 28m221 151c14-4 23-2 31 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>

      <div className="relative z-10 mx-auto grid w-full max-w-6xl items-center gap-8 lg:grid-cols-[1fr_minmax(0,0.95fr)] lg:gap-14">
        <section className="relative">
          <div className="mb-8 inline-flex items-center border-2 border-border bg-card p-3 shadow-[4px_4px_0_hsl(var(--border))]">
            <img src="/brand-logo-light.webp" alt="Zenkia Anime" className="h-14 w-auto max-w-[230px] object-contain dark:hidden" />
            <img src="/brand-logo-dark.webp" alt="Zenkia Anime" className="hidden h-14 w-auto max-w-[230px] object-contain dark:block" />
          </div>
          <p className="mb-3 font-mono text-[11px] font-bold tracking-[0.24em] text-accent uppercase">
            {mode === "signup" ? "Your anime chapter starts here" : "Welcome back, anime fan"}
          </p>
          <h2 className="max-w-xl font-display text-4xl leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">
            {mode === "signup" ? "Build your anime world." : "Pick up where you left off."}
          </h2>
          <p className="mt-5 max-w-lg text-base leading-7 text-muted-foreground sm:text-lg">
            Discover new favorites, save your watchlist, and keep track of every episode — all in one place.
          </p>
          <div className="mt-8 flex flex-wrap gap-2 font-mono text-[10px] font-bold tracking-widest uppercase">
            {["Discover", "Watchlist", "Episode history"].map((label, index) => (
              <span key={label} className="ink-panel-sm bg-card px-3 py-2">
                <span className="mr-2 text-accent">0{index + 1}</span>{label}
              </span>
            ))}
          </div>
        </section>

        <div className="ink-panel halftone p-6 sm:p-8">
        <h1 className="font-display text-2xl sm:text-3xl">
          {mode === "signin" ? "Welcome back" : "Join AnimeHub"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {mode === "signin"
            ? "Sign in to reach your watchlist and episode progress."
            : "Create an account to build your watchlist and track episodes."}
        </p>

        <button
          onClick={google}
          disabled={busy}
          className="ink-panel-sm ink-press mt-6 w-full bg-card px-4 py-3 font-mono text-xs font-bold tracking-widest uppercase"
        >
          Continue with Google
        </button>

        <div className="my-6 flex items-center gap-3">
          <span className="h-0.5 flex-1 bg-border" />
          <span className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
            or email
          </span>
          <span className="h-0.5 flex-1 bg-border" />
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="font-mono text-[10px] font-bold tracking-widest uppercase"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="ink-panel-sm mt-1.5 w-full bg-card px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label
              htmlFor="password"
              className="font-mono text-[10px] font-bold tracking-widest uppercase"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="ink-panel-sm mt-1.5 w-full bg-card px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
              placeholder="At least 6 characters"
            />
          </div>
          <button
            type="submit"
            disabled={busy}
            className="ink-panel-sm ink-press inline-flex w-full items-center justify-center gap-2 bg-accent px-4 py-3 font-mono text-xs font-bold tracking-widest text-accent-foreground uppercase"
          >
            {busy && <Loader2 className="size-4 animate-spin" />}
            {mode === "signin" ? "Sign in" : "Create account"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm">
          {mode === "signin" ? "New to AnimeHub?" : "Already have an account?"}{" "}
          <button
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            className="font-display text-accent underline underline-offset-4"
          >
            {mode === "signin" ? "Create one" : "Sign in"}
          </button>
        </p>
        </div>
      </div>
    </div>
  );
}
