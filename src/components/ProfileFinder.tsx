import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Search, UserRound, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const PROFILE_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type PublicProfileResult = {
  id: string;
  username: string | null;
  avatar_url: string | null;
  bio: string | null;
};

function profileIdFromInput(value: string) {
  const trimmed = value.trim();
  if (PROFILE_ID.test(trimmed)) return trimmed;

  const match = trimmed.match(/(?:^|\/)profile\/([^/?#]+)/i);
  if (!match) return null;
  try {
    const id = decodeURIComponent(match[1] ?? "");
    return PROFILE_ID.test(id) ? id : null;
  } catch {
    return null;
  }
}

export function ProfileFinder() {
  const navigate = useNavigate();
  const [input, setInput] = useState("");
  const [submittedUsername, setSubmittedUsername] = useState("");
  const [message, setMessage] = useState("");
  const results = useQuery({
    queryKey: ["public-profile-search", submittedUsername],
    enabled: submittedUsername.length > 0,
    staleTime: 30_000,
    queryFn: async (): Promise<PublicProfileResult[]> => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id,username,avatar_url,bio")
        .eq("is_public", true)
        .ilike("username", `%${submittedUsername}%`)
        .order("username", { ascending: true })
        .limit(8);
      if (error) throw error;
      return data ?? [];
    },
  });

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = input.trim();
    setMessage("");
    if (!value) return;

    const id = profileIdFromInput(value);
    if (id) {
      void navigate({ to: "/profile/$userId", params: { userId: id } });
      return;
    }

    if (/\/profile\//i.test(value)) {
      setSubmittedUsername("");
      setMessage("That profile link doesn’t look valid. Try searching by username instead.");
      return;
    }

    const username = value.replace(/^@/, "").trim();
    if (username.length < 2) {
      setSubmittedUsername("");
      setMessage("Enter at least two characters to search for a username.");
      return;
    }
    setSubmittedUsername(username);
  };

  return (
    <section className="ink-panel-sm bg-card p-4 sm:p-5" aria-labelledby="profile-finder-title">
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center border-2 border-border bg-background">
          <Users className="size-5" />
        </span>
        <div className="min-w-0">
          <h2 id="profile-finder-title" className="font-display text-lg sm:text-xl">
            Find a profile
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Paste a profile link or search public profiles by username.
          </p>
        </div>
      </div>

      <form onSubmit={submit} className="mt-4 flex flex-col gap-2 sm:flex-row">
        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          aria-label="Profile link or username"
          placeholder="Paste a profile link or enter a username"
          className="ink-panel-sm min-w-0 flex-1 bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
        <button
          type="submit"
          className="ink-panel-sm ink-press inline-flex min-h-10 items-center justify-center gap-2 bg-accent px-4 py-2 font-mono text-[10px] font-bold tracking-widest text-accent-foreground uppercase"
        >
          <Search className="size-4" /> Find
        </button>
      </form>

      {message && <p className="mt-3 text-sm text-muted-foreground">{message}</p>}
      {results.isFetching && (
        <p className="mt-3 text-sm text-muted-foreground" role="status">
          Searching public profiles…
        </p>
      )}
      {results.isError && (
        <p className="mt-3 text-sm text-destructive" role="alert">
          Profiles couldn’t be searched right now. Please try again.
        </p>
      )}
      {results.data && !results.isFetching && (
        results.data.length ? (
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {results.data.map((profile) => (
              <Link
                key={profile.id}
                to="/profile/$userId"
                params={{ userId: profile.id }}
                className="ink-panel-sm flex min-w-0 items-center gap-3 bg-background p-3 transition-colors hover:bg-muted"
              >
                <span className="grid size-10 shrink-0 place-items-center overflow-hidden border-2 border-border bg-card font-display">
                  {profile.avatar_url ? (
                    <img src={profile.avatar_url} alt="" className="size-full object-cover" />
                  ) : (
                    <UserRound className="size-5" />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-display text-sm">
                    {profile.username || "Anime Fan"}
                  </span>
                  {profile.bio && (
                    <span className="mt-0.5 block line-clamp-1 text-xs text-muted-foreground">
                      {profile.bio}
                    </span>
                  )}
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">
            No public profiles found for “{submittedUsername}”.
          </p>
        )
      )}
    </section>
  );
}

