import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
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
  const [username, setUsername] = useState("");
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
          await ensureProfile(data.user.id, username || email.split("@")[0]);
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
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      setBusy(false);
      toast.error("Google sign-in failed. Please try again.");
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/watchlist" });
  };

  return (
    <div className="mx-auto flex max-w-[520px] flex-col px-4 py-12 sm:px-6">
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
          {mode === "signup" && (
            <div>
              <label
                htmlFor="username"
                className="font-mono text-[10px] font-bold tracking-widest uppercase"
              >
                Display name
              </label>
              <input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="ink-panel-sm mt-1.5 w-full bg-card px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
                placeholder="Your name"
              />
            </div>
          )}
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
  );
}
