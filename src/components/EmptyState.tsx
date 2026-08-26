import React from "react";
import { Search, RotateCcw, FileQuestion, FilterX } from "lucide-react";

export interface EmptyStateProps {
  /** Main heading */
  title?: string;
  /** Subtitle or description */
  description?: string;
  /** Optional active search query */
  searchQuery?: string;
  /** Callback to clear/reset filters and query */
  onReset?: () => void;
  /** Custom action button text */
  resetLabel?: string;
  /** Icon variant */
  variant?: "search" | "filter" | "generic";
  /** Custom extra action buttons or elements */
  actions?: React.ReactNode;
  /** Optional container class name */
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title = "No results found",
  description,
  searchQuery,
  onReset,
  resetLabel = "Reset Search & Filters",
  variant = "search",
  actions,
  className = "",
}) => {
  const renderIcon = () => {
    switch (variant) {
      case "filter":
        return <FilterX className="w-8 h-8 text-slate-400 dark:text-slate-500" />;
      case "generic":
        return <FileQuestion className="w-8 h-8 text-slate-400 dark:text-slate-500" />;
      case "search":
      default:
        return <Search className="w-8 h-8 text-slate-400 dark:text-slate-500" />;
    }
  };

  const defaultDesc = searchQuery
    ? `We couldn't find anything matching "${searchQuery}" with fuzzy matching. Try checking for different keywords or clearing filters.`
    : "No records or items match the selected criteria.";

  return (
    <div
      id="app-empty-state"
      className={`bg-white dark:bg-slate-900 rounded-3xl p-8 sm:p-10 border border-slate-200/80 dark:border-slate-800 text-center space-y-4 max-w-md mx-auto shadow-xs transition-colors ${className}`}
    >
      <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 mx-auto flex items-center justify-center shadow-inner">
        {renderIcon()}
      </div>

      <div className="space-y-1.5">
        <h4 className="text-base font-extrabold text-slate-900 dark:text-slate-100">
          {title}
        </h4>
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-sm mx-auto">
          {description || defaultDesc}
        </p>
      </div>

      <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2">
        {onReset && (
          <button
            id="empty-state-reset-btn"
            onClick={onReset}
            type="button"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 text-xs font-extrabold rounded-xl transition cursor-pointer shadow-sm w-full sm:w-auto"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{resetLabel}</span>
          </button>
        )}
        {actions}
      </div>
    </div>
  );
};

export default EmptyState;
