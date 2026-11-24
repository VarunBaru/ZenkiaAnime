import { Link } from "@tanstack/react-router";

export function ShonenJumpPirateEmblem({ className = "size-8" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Shonen Jump Pirate Emblem"
    >
      {/* Background Badge Circle */}
      <circle cx="50" cy="50" r="48" fill="#E60012" stroke="#FFCC00" strokeWidth="4" />

      {/* Pirate Hat / Bandana Top */}
      <path
        d="M20 44C20 30 32 18 50 18C68 18 80 30 80 44C74 41 62 40 50 40C38 40 26 41 20 44Z"
        fill="#111116"
      />
      {/* Hat Yellow Trim */}
      <path
        d="M18 45C30 41 42 39 50 39C58 39 70 41 82 45C80 48 70 45 50 45C30 45 20 48 18 45Z"
        fill="#FFCC00"
      />

      {/* Hat Skull/Cross Emblem */}
      <circle cx="50" cy="28" r="4.5" fill="#FFFFFF" />
      <path
        d="M45 33L55 33M47 31L53 35M53 31L47 35"
        stroke="#FFCC00"
        strokeWidth="1.5"
        strokeLinecap="round"
      />

      {/* Face Base */}
      <path
        d="M24 45C24 68 35 78 50 78C65 78 76 68 76 45C66 43 56 42 50 42C44 42 34 43 24 45Z"
        fill="#FFE4C4"
      />

      {/* Eye Patch (Left eye) */}
      <path
        d="M32 46C29 50 29 57 34 60C39 63 44 59 45 54C46 49 42 45 36 45L32 46Z"
        fill="#111116"
      />
      <path d="M22 43L46 56" stroke="#111116" strokeWidth="2.5" strokeLinecap="round" />

      {/* Right Eye */}
      <circle cx="62" cy="52" r="4.5" fill="#111116" />
      <circle cx="64" cy="50.5" r="1.5" fill="#FFFFFF" />

      {/* Broad Manga Smile / Grin */}
      <path
        d="M34 64C40 73 60 73 66 64C60 67 40 67 34 64Z"
        fill="#FFFFFF"
        stroke="#111116"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      {/* Teeth dividers */}
      <line x1="44" y1="65" x2="44" y2="69" stroke="#111116" strokeWidth="1.5" />
      <line x1="50" y1="65.5" x2="50" y2="70" stroke="#111116" strokeWidth="1.5" />
      <line x1="56" y1="65" x2="56" y2="69" stroke="#111116" strokeWidth="1.5" />

      {/* Cheek Rosy Mark */}
      <ellipse cx="68" cy="59" rx="3.5" ry="1.8" fill="#FF7B7B" opacity="0.6" />
    </svg>
  );
}

export function ShonenJumpLogo({ showSubtitle = true }: { showSubtitle?: boolean }) {
  return (
    <Link to="/" className="group flex items-center gap-2.5 transition-transform active:scale-95">
      <div className="relative">
        <ShonenJumpPirateEmblem className="size-9 sm:size-10 transition-transform group-hover:rotate-6 group-hover:scale-105" />
        <span className="absolute -bottom-1 -right-1 rounded-sm bg-[#FFCC00] px-1 py-[1px] font-mono text-[9px] font-black uppercase text-black leading-none shadow-sm">
          PLUS
        </span>
      </div>

      <div className="flex flex-col">
        <div className="flex items-center gap-1.5">
          <span className="font-display text-lg sm:text-xl font-black tracking-tight text-white uppercase italic drop-shadow-[0_2px_4px_rgba(230,0,18,0.5)]">
            SHONEN <span className="text-[#E60012]">JUMP</span>
          </span>
          <span className="hidden sm:inline-block rounded bg-[#E60012] px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-white shadow-sm">
            COMICS
          </span>
        </div>
        {showSubtitle && (
          <span className="font-mono text-[9px] font-bold tracking-widest text-[#FFCC00] uppercase -mt-1">
            週刊少年ジャンプ · ZENKAI
          </span>
        )}
      </div>
    </Link>
  );
}
