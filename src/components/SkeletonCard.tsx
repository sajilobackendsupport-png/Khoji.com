import React from "react";

interface SkeletonCardProps {
  variant?: "card" | "list" | "table-row" | "profile" | "map-banner";
  count?: number;
  className?: string;
}

export const SkeletonCard: React.FC<SkeletonCardProps> = ({
  variant = "card",
  count = 1,
  className = "",
}) => {
  const items = Array.from({ length: count });

  if (variant === "profile") {
    return (
      <div className="space-y-3">
        {items.map((_, i) => (
          <div
            key={i}
            className={`p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 animate-pulse flex items-center gap-3.5 ${className}`}
          >
            <div className="w-12 h-12 rounded-2xl bg-slate-200 dark:bg-slate-800 flex-shrink-0" />
            <div className="space-y-2 flex-1 min-w-0">
              <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded-md w-1/3" />
              <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded-md w-2/3" />
            </div>
            <div className="w-16 h-8 rounded-xl bg-slate-200 dark:bg-slate-800" />
          </div>
        ))}
      </div>
    );
  }

  if (variant === "list") {
    return (
      <div className="space-y-2.5">
        {items.map((_, i) => (
          <div
            key={i}
            className={`p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 animate-pulse flex items-center justify-between gap-3 ${className}`}
          >
            <div className="space-y-2 flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <div className="h-3.5 bg-slate-200 dark:bg-slate-800 rounded-md w-1/4" />
                <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded-full w-12" />
              </div>
              <div className="h-2.5 bg-slate-200 dark:bg-slate-800 rounded-md w-1/2" />
            </div>
            <div className="w-20 h-7 rounded-lg bg-slate-200 dark:bg-slate-800" />
          </div>
        ))}
      </div>
    );
  }

  if (variant === "map-banner") {
    return (
      <div
        className={`w-full h-72 sm:h-96 rounded-3xl bg-slate-200 dark:bg-slate-800/80 animate-pulse relative overflow-hidden border border-slate-300 dark:border-slate-700/50 ${className}`}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
        <div className="absolute top-4 left-4 flex gap-2">
          <div className="w-28 h-8 rounded-xl bg-slate-300 dark:bg-slate-700" />
          <div className="w-24 h-8 rounded-xl bg-slate-300 dark:bg-slate-700" />
        </div>
      </div>
    );
  }

  // Default "card" variant
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
      {items.map((_, i) => (
        <div
          key={i}
          className={`p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 animate-pulse space-y-4 shadow-xs ${className}`}
        >
          <div className="flex items-center justify-between">
            <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded-md w-2/5" />
            <div className="h-5 bg-slate-200 dark:bg-slate-800 rounded-full w-14" />
          </div>
          <div className="space-y-2">
            <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded-md w-full" />
            <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded-md w-4/5" />
          </div>
          <div className="pt-2 flex items-center justify-between border-t border-slate-100 dark:border-slate-800/80">
            <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded-md w-1/4" />
            <div className="h-7 bg-slate-200 dark:bg-slate-800 rounded-xl w-20" />
          </div>
        </div>
      ))}
    </div>
  );
};

export default SkeletonCard;
