import React, { useState } from "react";
import { signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { auth, googleProvider } from "../firebase";
import { Shield, Radio, KeyRound, Mail, AlertCircle, Sparkles, LogIn } from "lucide-react";

interface AuthScreenProps {
  onSandboxToggle: (mode: "real" | "legacy-demo", mockRole?: "user" | "admin") => void;
  isLoading: boolean;
}

export default function AuthScreen({ onSandboxToggle, isLoading: parentLoading }: AuthScreenProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  // Real Google Sign in Handler using popup flow
  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      console.error("Google Auth failed:", err);
      if (err.code === "auth/unauthorized-domain" || (err.message && err.message.toLowerCase().includes("unauthorized-domain"))) {
        const currentHost = window.location.hostname;
        const currentOrigin = window.location.origin;
        setError(
          `UNAUTHORIZED_DOMAIN: This preview domain ("${currentHost}") is not registered in your Firebase Console yet. To authorize it:\n1. Open your Firebase Console\n2. Navigate to Build > Authentication > Settings > Authorized Domains\n3. Click "Add domain" and enter:\n   ${currentHost}\n\nAlternatively, bypass the authentication check using the simulated buttons below to play around with all features.`
        );
      } else {
        setError(
          err.code === "auth/popup-blocked"
            ? "Login popup was blocked by browser. Please enable popups for this site."
            : `Auth connection failed: ${err.message || "Unknown reason"}. Please consider testing with Sandbox bypass below.`
        );
      }
    } finally {
      setLoading(false);
    }
  };

  // Secure handler for custom requested Admin credentials
  const handleCustomLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (username.trim() === "Khoji@2026" && password.trim() === "Khoji@9708547685") {
      onSandboxToggle("legacy-demo", "admin");
    } else {
      setError(
        "❌ Access Denied: Invalid Command Center credentials. Please use the requested Username: Khoji@2026 and Password: Khoji@9708547685 for full Dispatch Admin authority."
      );
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen bg-slate-900 flex items-center justify-center p-4 relative font-sans overflow-hidden"
      id="auth-screen-backdrop"
    >
      {/* Visual glowing particle decorations (Cosmic Slate style) */}
      <div className="absolute top-1/4 left-1/4 w-80 h-80 rounded-full bg-red-600/10 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-indigo-600/10 blur-[100px] pointer-events-none" />

      {/* Main card panel */}
      <div className="bg-slate-950 border border-slate-800 rounded-3xl w-full max-w-md p-6 md:p-8 space-y-7 shadow-2xl relative z-10 animate-fade-in">
        
        {/* Branding header area */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 bg-red-600 rounded-2xl flex items-center justify-center text-white mx-auto shadow-xl shadow-red-950 hover:scale-105 transition-transform duration-300">
            <Shield className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-2xl font-extrabold text-white tracking-tight">Khoji<span className="text-red-500">.com</span></h2>
            <p className="text-[11px] text-slate-400 font-mono tracking-widest uppercase">Nepal Emergency Live Tracking</p>
          </div>
        </div>

        {error && (
          <div className="p-3.5 bg-red-950/40 border border-red-900/60 text-red-300 text-xs rounded-xl flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-red-400" />
            <p className="leading-tight">{error}</p>
          </div>
        )}

        {/* Custom Admin Login Form */}
        <form onSubmit={handleCustomLogin} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Administrator Username</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
              <input
                type="text"
                required
                placeholder="e.g. Khoji@2026"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full text-xs pl-10 pr-4 py-3 bg-slate-900/60 border border-slate-800 text-white rounded-xl focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500 transition font-sans text-slate-100"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Security Password</label>
            <div className="relative">
              <KeyRound className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
              <input
                type="password"
                required
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full text-xs pl-10 pr-4 py-3 bg-slate-900/60 border border-slate-800 text-white rounded-xl focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500 transition font-sans text-slate-100"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || parentLoading}
            className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white py-3 px-4 rounded-xl font-bold text-xs transition shadow-lg hover:translate-y-[-1px] disabled:opacity-50 cursor-pointer"
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Verify & Authenticate Admin</span>
          </button>
        </form>

        {/* Divider badge */}
        <div className="relative flex items-center justify-center">
          <div className="absolute inset-0 flex items-center" aria-hidden="true">
            <div className="w-full border-t border-slate-850"></div>
          </div>
          <span className="relative px-3 bg-slate-950 text-[9px] font-bold text-slate-500 uppercase tracking-widest">
            Other Entry Options
          </span>
        </div>

        {/* Action Panel for real Auth */}
        <div className="space-y-4">
          <button
            onClick={handleGoogleSignIn}
            disabled={loading || parentLoading}
            className="w-full flex items-center justify-center gap-3 bg-white hover:bg-slate-50 text-slate-900 py-3 px-4 rounded-xl font-extrabold text-xs transition shadow-lg hover:translate-y-[-1px] active:translate-y-0 disabled:opacity-50 cursor-pointer"
          >
            {/* Google Icon Vector */}
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v3.92h6.61c-.29 1.5-.1.8-.88 2.05v2.53h10.7a10.66 10.66 0 0 0 3.32-6.43z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-10.7-2.53c-1.05.7-2.4 1.12-3.9 1.12-3.03 0-5.6-2.05-6.51-4.8H1l-1.04 2.53C2.33 21.07 6.84 24 12 24z"
              />
              <path
                fill="#FBBC05"
                d="M5.49 14.88A7.16 7.16 0 0 1 5.07 12c0-.98.17-1.95.42-2.88V6.59H1L1 1A12 12 0 0 0 1 12a12 12 0 0 0 .1 5.88l3.49-3.0z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.6 4.6 1.8l3.43-3.43C17.95 1.19 15.24 0 12 0 6.84 0 2.33 2.93 1 7.22l5.42 4.22c.9-2.75 3.48-4.75 6.51-4.75z"
              />
            </svg>
            <span>Continue with Google Single Sign-In</span>
          </button>
        </div>

        {/* Sandbox Quick Bypass Area */}
        <div className="space-y-3 bg-slate-900/40 p-4 border border-slate-800/80 rounded-2xl relative">
          <div className="flex items-center gap-2 mb-1.5 text-indigo-400">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Fast-Track Simulation</span>
          </div>

          <p className="text-[10px] text-slate-400 leading-normal mb-1">
            Evaluate or demonstrate the application workflows instantly:
          </p>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              onClick={() => onSandboxToggle("legacy-demo", "user")}
              className="py-2.5 px-3 bg-slate-900 hover:bg-slate-850 text-indigo-200 rounded-xl font-bold flex items-center justify-center gap-1.5 border border-slate-800 hover:border-slate-700 transition text-[10px] cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5 text-slate-400" />
              <span>Citizen Mode</span>
            </button>
            <button
              onClick={() => onSandboxToggle("legacy-demo", "admin")}
              className="py-2.5 px-3 bg-slate-900 hover:bg-slate-850 text-red-400 rounded-xl font-bold flex items-center justify-center gap-1.5 border border-slate-800 hover:border-slate-700 transition text-[10px] cursor-pointer"
            >
              <Shield className="w-3.5 h-3.5 text-slate-400 font-bold" />
              <span>Admin Mode</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
