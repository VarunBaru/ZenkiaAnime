import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

export function PanelSkeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton-surface bg-muted ink-panel-sm ${className}`} />;
}

export function CardSkeletonRow({ count = 6 }: { count?: number }) {
  return (
    <div className="flex gap-5 overflow-hidden pb-2">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="w-[150px] shrink-0 sm:w-[190px]">
          <PanelSkeleton className="aspect-2/3 w-full" />
          <div className="mt-3 h-4 w-3/4 skeleton-surface bg-muted" />
          <div className="mt-2 h-3 w-1/2 skeleton-surface bg-muted" />
        </div>
      ))}
    </div>
  );
}

export function CardSkeletonGrid({ count = 12 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i}>
          <PanelSkeleton className="aspect-2/3 w-full" />
          <div className="mt-3 h-4 w-3/4 skeleton-surface bg-muted" />
        </div>
      ))}
    </div>
  );
}

export function ErrorState({
  title = "Couldn't load this right now",
  message = "Something went wrong while loading this.",
  onRetry,
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="ink-panel halftone p-6 text-center sm:p-8">
      <p className="font-display text-xl text-accent sm:text-2xl">{title}</p>
      <p className="mx-auto mt-2 max-w-[46ch] text-sm text-muted-foreground">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="ink-panel-sm ink-press mt-5 bg-accent px-5 py-2.5 font-mono text-xs font-bold tracking-widest text-accent-foreground uppercase"
        >
          Try again
        </button>
      )}
    </div>
  );
}

export function EmptyState({
  title,
  message,
  action,
}: {
  title: string;
  message: string;
  action?: ReactNode;
}) {
  return (
    <div className="ink-panel p-8 text-center">
      <p className="font-display text-xl sm:text-2xl">{title}</p>
      <p className="mx-auto mt-2 max-w-[48ch] text-sm text-muted-foreground">{message}</p>
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}

export function InkButtonLink({
  to,
  children,
  accent = false,
}: {
  to: string;
  children: ReactNode;
  accent?: boolean;
}) {
  return (
    <Link
      to={to}
      className={`ink-panel-sm ink-press inline-block px-5 py-2.5 font-mono text-xs font-bold tracking-widest uppercase ${
        accent ? "bg-accent text-accent-foreground" : "bg-card text-foreground"
      }`}
    >
      {children}
    </Link>
  );
}
