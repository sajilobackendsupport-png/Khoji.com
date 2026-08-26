import React from "react";
import { AlertTriangle, Home, RotateCcw, ShieldAlert, ArrowLeft } from "lucide-react";

interface ErrorFallbackProps {
  title?: string;
  message?: string;
  error?: Error | string;
  onReset?: () => void;
  onGoHome?: () => void;
}

/**
 * Custom 404 Page Not Found component
 */
export const NotFound404: React.FC<ErrorFallbackProps> = ({
  title = "404 - Page Not Found",
  message = "The emergency resource, node, or page you are looking for does not exist or has been relocated.",
  onGoHome,
}) => {
  return (
    <div
      id="error-404-screen"
      className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center select-none"
    >
      <div className="relative mb-6">
        <div className="w-24 h-24 rounded-3xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex items-center justify-center text-amber-600 dark:text-amber-400 shadow-xl shadow-amber-500/10">
          <ShieldAlert className="w-12 h-12" />
        </div>
        <span className="absolute -bottom-2 -right-2 bg-slate-900 text-amber-300 font-mono text-[10px] font-black px-2 py-0.5 rounded-full border border-slate-800">
          ERR_404
        </span>
      </div>

      <div className="space-y-2 max-w-md">
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100">
          {title}
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
          {message}
        </p>
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <button
          onClick={() => (onGoHome ? onGoHome() : (window.location.href = "/"))}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 text-xs font-extrabold rounded-xl transition cursor-pointer shadow-md"
        >
          <Home className="w-4 h-4" />
          <span>Return to Dashboard</span>
        </button>
        <button
          onClick={() => window.history.back()}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 transition cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Go Back</span>
        </button>
      </div>
    </div>
  );
};

/**
 * Custom 500 Server / Critical Error Fallback screen
 */
export const ServerError500: React.FC<ErrorFallbackProps> = ({
  title = "500 - System Service Error",
  message = "An unexpected error occurred while communicating with the tracking network or database nodes.",
  error,
  onReset,
}) => {
  return (
    <div
      id="error-500-screen"
      className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center select-none"
    >
      <div className="relative mb-6">
        <div className="w-24 h-24 rounded-3xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 flex items-center justify-center text-rose-600 dark:text-rose-400 shadow-xl shadow-rose-500/10">
          <AlertTriangle className="w-12 h-12" />
        </div>
        <span className="absolute -bottom-2 -right-2 bg-red-600 text-white font-mono text-[10px] font-black px-2 py-0.5 rounded-full border border-red-500 shadow">
          CRITICAL_500
        </span>
      </div>

      <div className="space-y-2 max-w-md">
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100">
          {title}
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
          {message}
        </p>
      </div>

      {error && (
        <div className="mt-4 p-3 max-w-md w-full bg-slate-100 dark:bg-slate-950/80 rounded-xl border border-slate-200 dark:border-slate-800 text-left font-mono text-[11px] text-rose-600 dark:text-rose-400 overflow-x-auto">
          {typeof error === "string" ? error : error.message || String(error)}
        </div>
      )}

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <button
          onClick={() => (onReset ? onReset() : window.location.reload())}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-extrabold rounded-xl transition cursor-pointer shadow-lg shadow-red-500/20"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Reload Application</span>
        </button>
        <button
          onClick={() => (window.location.href = "/")}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 transition cursor-pointer"
        >
          <Home className="w-4 h-4" />
          <span>Go Home</span>
        </button>
      </div>
    </div>
  );
};

export default {
  NotFound404,
  ServerError500,
};
