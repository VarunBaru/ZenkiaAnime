import { usePreferences, type AnimeLanguage, type ThemePref } from "@/lib/preferences";
import { cn } from "@/lib/utils";

function Segment<T extends string>({
  label,
  value,
  options,
  onChange,
  showText,
}: {
  label: string;
  value: T;
  options: { value: T; text: string; icon?: React.ReactNode }[];
  onChange: (v: T) => void;
  showText?: boolean | undefined;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="ink-panel-sm inline-flex bg-card">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={o.icon && !showText ? o.text : undefined}
            title={o.text}
            onClick={() => onChange(o.value)}
            className={cn(
              "inline-flex items-center gap-1.5 px-2.5 py-1.5 font-mono text-[11px] font-bold tracking-widest uppercase outline-none focus-visible:ring-2 focus-visible:ring-ring",
              active
                ? "bg-accent text-accent-foreground underline underline-offset-4"
                : "hover:bg-muted",
            )}
          >
            {o.icon}
            {(!o.icon || showText) && <span>{o.text}</span>}
          </button>
        );
      })}
    </div>
  );
}

const LANGS: { value: AnimeLanguage; text: string }[] = [
  { value: "en", text: "EN" },
  { value: "jp", text: "JP" },
];

export function LanguageToggle() {
  const { language, setLanguage } = usePreferences();
  return (
    <Segment
      label="Preferred anime audio: EN for English dub, JP for Japanese original"
      value={language}
      options={LANGS}
      onChange={setLanguage}
    />
  );
}

export function ThemeToggle({ showText }: { showText?: boolean }) {
  const { theme, setTheme } = usePreferences();
  const opts: { value: ThemePref; text: string }[] = [
    { value: "manga", text: "Manga" },
    { value: "glass", text: "Liquid Glass" },
    { value: "netflix", text: "Netflix" },
  ];
  return (
    <Segment
      label="Website theme"
      value={theme}
      options={opts}
      onChange={setTheme}
      showText={showText}
    />
  );
}

export function ThemeSelect() {
  const { theme, setTheme } = usePreferences();

  return (
    <label className="flex shrink-0 items-center gap-1.5">
      <span className="font-mono text-[10px] font-bold tracking-widest uppercase">Theme</span>
      <select
        aria-label="Site theme"
        title="Choose site theme"
        value={theme}
        onChange={(event) => setTheme(event.target.value as ThemePref)}
        className="ink-panel-sm max-w-28 bg-card px-2 py-2 font-mono text-[10px] font-bold uppercase"
      >
        <option value="manga">Manga</option>
        <option value="glass">Liquid Glass</option>
        <option value="netflix">Netflix</option>
      </select>
    </label>
  );
}

export function MobileSettings() {
  return (
    <div className="mt-4 space-y-3 border-t-2 border-border pt-4">
      <div>
        <p className="mb-1.5 font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
          Anime language
        </p>
        <LanguageToggle />
      </div>
      <div>
        <p className="mb-1.5 font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
          Site theme
        </p>
        <ThemeToggle showText />
      </div>
    </div>
  );
}
