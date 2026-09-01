import { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RotateCcw, Home, ShieldAlert, Trash2 } from "lucide-react";

export interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  name?: string;
}

export interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error("Uncaught application error in", this.props.name || "Root", error, errorInfo);
    this.setState({ error, errorInfo });
  }

  private handleReset = (): void => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  };

  private handleClearStorageAndReload = (): void => {
    try {
      if (typeof window !== "undefined") {
        localStorage.clear();
        sessionStorage.clear();
        window.location.href = "/";
      }
    } catch {
      window.location.reload();
    }
  };

  public render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const errorMessage = this.state.error?.message || "An unexpected rendering error occurred.";
      const errorStack = this.state.error?.stack;

      return (
        <div
          id="system-error-boundary"
          className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4 sm:p-6 select-none"
        >
          <div className="max-w-md w-full bg-slate-900 border border-red-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-red-500/10 text-center relative overflow-hidden">
            {/* Top Glow Accent */}
            <div className="absolute -top-12 -left-12 w-48 h-48 bg-red-600/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-12 -right-12 w-48 h-48 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />

            {/* Error Emblem */}
            <div className="relative mx-auto w-20 h-20 rounded-3xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 mb-6 shadow-lg shadow-red-500/10">
              <ShieldAlert className="w-10 h-10 animate-pulse" />
              <span className="absolute -bottom-2 -right-2 bg-red-600 text-white font-mono text-[9px] font-black px-2 py-0.5 rounded-full border border-red-400">
                DEFENSIVE_GUARD
              </span>
            </div>

            {/* Title & Description */}
            <h1 className="text-xl sm:text-2xl font-black text-white mb-2 tracking-tight">
              Application Resilience Guard
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mb-5 leading-relaxed">
              Khoji Nepal caught a runtime rendering exception and prevented a blank screen. You can reload the application or reset stored sessions safely.
            </p>

            {/* Error Diagnostic Box */}
            <div className="mb-6 p-3 bg-slate-950/80 rounded-2xl border border-slate-800 text-left font-mono text-[11px] text-red-300 max-h-36 overflow-y-auto break-all select-text">
              <div className="font-bold text-red-400 flex items-center gap-1.5 mb-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Error details:</span>
              </div>
              <p className="text-slate-300">{errorMessage}</p>
              {errorStack && (
                <pre className="text-[9px] text-slate-500 mt-2 whitespace-pre-wrap">
                  {errorStack.split("\n").slice(0, 4).join("\n")}
                </pre>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={this.handleReset}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 bg-red-600 hover:bg-red-500 text-white text-xs font-black rounded-xl transition shadow-lg shadow-red-600/30 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Reload App</span>
              </button>

              <button
                onClick={this.handleClearStorageAndReload}
                className="inline-flex items-center justify-center gap-2 px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition cursor-pointer"
                title="Clears corrupted browser cache/storage and starts fresh"
              >
                <Trash2 className="w-3.5 h-3.5 text-slate-400" />
                <span>Reset Cache</span>
              </button>
            </div>

            <div className="mt-4">
              <a
                href="/"
                className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition font-medium"
              >
                <Home className="w-3.5 h-3.5" />
                <span>Back to Root URL</span>
              </a>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
