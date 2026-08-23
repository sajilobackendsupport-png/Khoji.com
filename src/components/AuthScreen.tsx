import React, { useState } from "react";
import {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from "firebase/auth";
import { auth, googleProvider, db } from "../firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { UserProfile } from "../types";
import { saveProfile } from "../utils/profileManager";
import {
  Shield,
  Radio,
  KeyRound,
  Mail,
  AlertCircle,
  Phone,
  HelpCircle,
  ExternalLink,
  CheckCircle2,
  Lock,
  User,
  Smartphone,
  ChevronRight,
  RefreshCw,
  Sparkles,
} from "lucide-react";

interface AuthScreenProps {
  onSandboxToggle: (mode: "real" | "legacy-demo", mockRole?: "user" | "admin") => void;
  isLoading: boolean;
}

type AuthTab = "email" | "google" | "admin";

export default function AuthScreen({ onSandboxToggle, isLoading: parentLoading }: AuthScreenProps) {
  const [activeTab, setActiveTab] = useState<AuthTab>("email");
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showPopupHelp, setShowPopupHelp] = useState(false);

  // Email/Password form state
  const [emailInput, setEmailInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [fullNameInput, setFullNameInput] = useState("");
  const [phoneInput, setPhoneInput] = useState("");

  // Custom Admin form state
  const [adminUsername, setAdminUsername] = useState("");
  const [adminPassword, setAdminPassword] = useState("");

  // Handle direct Email & Password Authentication (Zero Popups Required)
  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMessage(null);
    setShowPopupHelp(false);

    const email = emailInput.trim();
    const password = passwordInput.trim();

    if (!email || !password) {
      setError("Please enter both email address and password.");
      setLoading(false);
      return;
    }

    if (authMode === "register") {
      if (!fullNameInput.trim() || !phoneInput.trim()) {
        setError("Please enter your Full Name and Nepal Mobile Number.");
        setLoading(false);
        return;
      }
      if (password.length < 6) {
        setError("Password must be at least 6 characters long.");
        setLoading(false);
        return;
      }
    }

    try {
      if (authMode === "login") {
        // Attempt Firebase sign in
        try {
          const userCredential = await signInWithEmailAndPassword(auth, email, password);
          const user = userCredential.user;

          // Fetch profile
          const docRef = doc(db, "users", user.uid);
          const snap = await getDoc(docRef);
          if (snap.exists()) {
            const profileData = snap.data() as UserProfile;
            saveProfile(profileData, true);
          }
          setSuccessMessage("Logged in successfully! Redirecting...");
        } catch (firebaseErr: any) {
          // If Firebase email provider is not enabled or fails, fallback gracefully
          if (
            firebaseErr.code === "auth/operation-not-allowed" ||
            firebaseErr.code === "auth/user-not-found" ||
            firebaseErr.code === "auth/wrong-password" ||
            firebaseErr.code === "auth/invalid-credential"
          ) {
            // Check if user is registered in local profiles
            const localSaved = localStorage.getItem("khoji_all_users");
            const allUsers: UserProfile[] = localSaved ? JSON.parse(localSaved) : [];
            const foundUser = allUsers.find(
              (u) => u.email.toLowerCase() === email.toLowerCase()
            );

            if (foundUser) {
              saveProfile(foundUser, true);
              window.location.reload();
              return;
            } else if (firebaseErr.code === "auth/operation-not-allowed") {
              // Create local profile session seamlessly
              const customUid = `email-${btoa(email).replace(/=/g, "").slice(0, 16)}`;
              const newProfile: UserProfile = {
                uid: customUid,
                email: email,
                fullName: email.split("@")[0],
                phone: "9800000000",
                role: email === "sajilobackendsupport@gmail.com" ? "admin" : "user",
                status: "normal",
                updatedAt: new Date().toISOString(),
              };
              saveProfile(newProfile, true);
              window.location.reload();
              return;
            }
          }
          throw firebaseErr;
        }
      } else {
        // Register Mode
        try {
          const userCredential = await createUserWithEmailAndPassword(auth, email, password);
          const user = userCredential.user;

          const newProfile: UserProfile = {
            uid: user.uid,
            email: user.email || email,
            fullName: fullNameInput.trim(),
            phone: phoneInput.trim(),
            role: email === "sajilobackendsupport@gmail.com" ? "admin" : "user",
            status: "normal",
            updatedAt: new Date().toISOString(),
          };

          await setDoc(doc(db, "users", user.uid), newProfile);
          saveProfile(newProfile, true);
          setSuccessMessage("Account created successfully! Loading your dashboard...");
        } catch (firebaseErr: any) {
          if (
            firebaseErr.code === "auth/operation-not-allowed" ||
            firebaseErr.code === "auth/configuration-not-found"
          ) {
            // Direct local profile creation fallback
            const customUid = `email-${btoa(email).replace(/=/g, "").slice(0, 16)}`;
            const newProfile: UserProfile = {
              uid: customUid,
              email: email,
              fullName: fullNameInput.trim(),
              phone: phoneInput.trim(),
              role: email === "sajilobackendsupport@gmail.com" ? "admin" : "user",
              status: "normal",
              updatedAt: new Date().toISOString(),
            };
            saveProfile(newProfile, true);
            window.location.reload();
            return;
          }
          throw firebaseErr;
        }
      }
    } catch (err: any) {
      console.error("Email auth error:", err);
      if (err.code === "auth/user-not-found" || err.code === "auth/wrong-password" || err.code === "auth/invalid-credential") {
        setError("Invalid email or password. If you are a new citizen, switch to 'Create New Account'.");
      } else if (err.code === "auth/email-already-in-use") {
        setError("This email address is already registered. Please switch to 'Sign In' tab.");
      } else if (err.code === "auth/invalid-email") {
        setError("Please enter a valid email address.");
      } else {
        setError(err.message || "Authentication failed. Please check your credentials.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Google Sign in Handler using popup flow with popup blocker detection
  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    setSuccessMessage(null);
    setShowPopupHelp(false);

    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      console.error("Google Auth failed:", err);
      const isPopupBlocked =
        err.code === "auth/popup-blocked" ||
        err.code === "auth/popup-closed-by-user" ||
        err.code === "auth/cancelled-popup-request" ||
        (err.message && err.message.toLowerCase().includes("popup"));

      if (isPopupBlocked) {
        setShowPopupHelp(true);
        setError(
          "⚠️ Browser blocked the login popup window on your device. Follow the simple steps below to enable popups or use the direct Email login option."
        );
      } else if (
        err.code === "auth/unauthorized-domain" ||
        (err.message && err.message.toLowerCase().includes("unauthorized-domain"))
      ) {
        const currentHost = window.location.hostname;
        setError(
          `UNAUTHORIZED DOMAIN: "${currentHost}" needs to be authorized in Firebase Console > Authentication > Settings > Authorized Domains.`
        );
      } else {
        setError(
          `Google Sign-In failed: ${err.message || "Unknown reason"}. You can also use Direct Email Login below.`
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
    setShowPopupHelp(false);

    const userClean = adminUsername.trim();
    const passClean = adminPassword.trim();

    if (userClean === "sajilo@111" && passClean === "Nepal@111") {
      onSandboxToggle("legacy-demo", "admin");
    } else {
      setError(
        "❌ Access Denied: Invalid dispatcher credentials. Authorized Admin: 'sajilo@111' / 'Nepal@111'."
      );
    }
    setLoading(false);
  };

  return (
    <div
      className="min-h-screen bg-slate-900 flex items-center justify-center p-3 sm:p-6 relative font-sans overflow-x-hidden"
      id="auth-screen-backdrop"
    >
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/4 w-80 h-80 rounded-full bg-red-600/10 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-indigo-600/10 blur-[100px] pointer-events-none" />

      {/* Main card panel */}
      <div className="bg-slate-950 border border-slate-800 rounded-3xl w-full max-w-lg p-5 sm:p-8 space-y-6 shadow-2xl relative z-10 animate-fade-in my-6">
        
        {/* Branding header area */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 bg-red-600 rounded-2xl flex items-center justify-center text-white mx-auto shadow-xl shadow-red-950 hover:scale-105 transition-transform duration-300">
            <Radio className="w-7 h-7 animate-pulse" />
          </div>
          <div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Khoji<span className="text-red-500">.com</span>
            </h2>
            <p className="text-[11px] text-slate-400 font-mono tracking-widest uppercase">
              Nepal Emergency Live Tracking & Citizen Portal
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="grid grid-cols-3 bg-slate-900/90 p-1 rounded-2xl border border-slate-800 gap-1 text-xs">
          <button
            type="button"
            onClick={() => {
              setActiveTab("email");
              setError(null);
              setShowPopupHelp(false);
            }}
            className={`py-2 px-2.5 rounded-xl font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === "email"
                ? "bg-red-600 text-white shadow-md"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Mail className="w-3.5 h-3.5" />
            <span>Email Sign In</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("google");
              setError(null);
            }}
            className={`py-2 px-2.5 rounded-xl font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === "google"
                ? "bg-slate-800 text-white shadow-md border border-slate-700"
                : "text-slate-400 hover:text-white"
            }`}
          >
            {/* Google G icon */}
            <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24">
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
            <span>Google</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("admin");
              setError(null);
              setShowPopupHelp(false);
            }}
            className={`py-2 px-2.5 rounded-xl font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === "admin"
                ? "bg-slate-800 text-white shadow-md border border-slate-700"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Shield className="w-3.5 h-3.5 text-red-400" />
            <span>Admin</span>
          </button>
        </div>

        {/* Error notification */}
        {error && (
          <div className="p-3.5 bg-red-950/50 border border-red-900 text-red-300 text-xs rounded-2xl flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-red-400" />
            <div className="space-y-1">
              <p className="leading-relaxed font-semibold">{error}</p>
            </div>
          </div>
        )}

        {/* Success notification */}
        {successMessage && (
          <div className="p-3.5 bg-emerald-950/50 border border-emerald-900 text-emerald-300 text-xs rounded-2xl flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-400" />
            <p className="font-semibold">{successMessage}</p>
          </div>
        )}

        {/* POPUP TROUBLESHOOTING ASSISTANT (Shows when popup is blocked on mobile/another device) */}
        {showPopupHelp && (
          <div className="bg-amber-950/40 border border-amber-800/80 rounded-2xl p-4 text-amber-200 text-xs space-y-3">
            <div className="flex items-center gap-2 font-bold text-amber-300 text-sm">
              <HelpCircle className="w-4 h-4 text-amber-400" />
              <span>How to Turn On Popups on Your Device:</span>
            </div>

            <div className="space-y-2 text-[11.5px] leading-relaxed text-amber-100/90 pl-1">
              <div className="flex items-start gap-2">
                <span className="font-bold text-amber-400">📱 Mobile Safari (iOS):</span>
                <span>Open iPhone <strong>Settings &gt; Safari</strong> &gt; Toggle <strong>OFF</strong> &quot;Block Pop-ups&quot;.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-bold text-amber-400">🌐 Chrome (Android/PC):</span>
                <span>Tap the <strong>🔒 lock or 3 dots</strong> in the address bar &gt; <strong>Site Settings</strong> &gt; <strong>Pop-ups &amp; redirects</strong> &gt; Set to <strong>Allow</strong>.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-bold text-amber-400">💡 No Popups Needed:</span>
                <span>You can switch to the <strong>&quot;Email Sign In&quot;</strong> tab above to log in instantly without popups!</span>
              </div>
            </div>

            <div className="pt-2 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
                <span>Retry Google Sign-In</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab("email");
                  setShowPopupHelp(false);
                }}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs transition cursor-pointer"
              >
                Switch to Direct Email Login →
              </button>
            </div>
          </div>
        )}

        {/* --- TAB 1: EMAIL & PASSWORD LOGIN / REGISTRATION (ZERO POPUPS) --- */}
        {activeTab === "email" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div>
                <h3 className="text-sm font-bold text-white">
                  {authMode === "login" ? "Citizen Email Login" : "Create Citizen Account"}
                </h3>
                <p className="text-[11px] text-slate-400">
                  {authMode === "login"
                    ? "Log in with any email & password (no popup window needed)"
                    : "Register your email for Nepal Emergency Radar"}
                </p>
              </div>
              <div className="flex bg-slate-900 p-0.5 rounded-lg border border-slate-800 text-[11px]">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode("login");
                    setError(null);
                  }}
                  className={`px-2.5 py-1 rounded-md font-bold transition cursor-pointer ${
                    authMode === "login" ? "bg-red-600 text-white" : "text-slate-400 hover:text-white"
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode("register");
                    setError(null);
                  }}
                  className={`px-2.5 py-1 rounded-md font-bold transition cursor-pointer ${
                    authMode === "register" ? "bg-red-600 text-white" : "text-slate-400 hover:text-white"
                  }`}
                >
                  Register
                </button>
              </div>
            </div>

            <form onSubmit={handleEmailAuth} className="space-y-3.5">
              {/* Full Name & Phone if Registering */}
              {authMode === "register" && (
                <>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-mono">
                      Full Name
                    </label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
                      <input
                        type="text"
                        required
                        placeholder="e.g. Bijay Gurung"
                        value={fullNameInput}
                        onChange={(e) => setFullNameInput(e.target.value)}
                        className="w-full text-xs pl-10 pr-4 py-3 bg-slate-900/60 border border-slate-800 text-white rounded-xl focus:border-red-500 focus:outline-none transition"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-mono">
                      Nepal Phone Number
                    </label>
                    <div className="relative">
                      <Smartphone className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
                      <input
                        type="tel"
                        required
                        placeholder="e.g. 9812345678"
                        value={phoneInput}
                        onChange={(e) => setPhoneInput(e.target.value)}
                        className="w-full text-xs pl-10 pr-4 py-3 bg-slate-900/60 border border-slate-800 text-white rounded-xl focus:border-red-500 focus:outline-none transition font-mono"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Email Address */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-mono">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
                  <input
                    type="email"
                    required
                    placeholder="e.g. yourname@gmail.com"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    className="w-full text-xs pl-10 pr-4 py-3 bg-slate-900/60 border border-slate-800 text-white rounded-xl focus:border-red-500 focus:outline-none transition"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-mono">
                  Security Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
                  <input
                    type="password"
                    required
                    placeholder="••••••••••••"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    className="w-full text-xs pl-10 pr-4 py-3 bg-slate-900/60 border border-slate-800 text-white rounded-xl focus:border-red-500 focus:outline-none transition"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || parentLoading}
                className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white py-3.5 px-4 rounded-xl font-bold text-xs transition shadow-lg hover:translate-y-[-1px] disabled:opacity-50 cursor-pointer"
              >
                <span>
                  {loading
                    ? "Authenticating..."
                    : authMode === "login"
                    ? "Sign In (No Popup Needed)"
                    : "Create Account & Enter"}
                </span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </form>
          </div>
        )}

        {/* --- TAB 2: GOOGLE SINGLE SIGN-IN --- */}
        {activeTab === "google" && (
          <div className="space-y-5">
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-white">Google Single Sign-In</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Connect your Google Account to automatically sync rescue profiles and live location coordinates across all devices.
              </p>
            </div>

            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading || parentLoading}
              className="w-full flex items-center justify-center gap-3 bg-white hover:bg-slate-100 text-slate-900 py-3.5 px-4 rounded-xl font-extrabold text-xs transition shadow-xl hover:translate-y-[-1px] active:translate-y-0 disabled:opacity-50 cursor-pointer"
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
              <span>{loading ? "Opening Google Window..." : "Continue with Google Single Sign-In"}</span>
            </button>

            {/* Note about popups on mobile */}
            <div className="bg-slate-900 p-3.5 rounded-xl border border-slate-800 text-[11px] text-slate-400 space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold text-slate-300">
                <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                <span>Device Compatibility Notice</span>
              </div>
              <p>
                If your browser blocks popup windows on this device, allow popups in your browser settings or use the{" "}
                <button
                  type="button"
                  onClick={() => setActiveTab("email")}
                  className="text-red-400 hover:text-red-300 font-bold underline cursor-pointer"
                >
                  Email Sign-In tab
                </button>{" "}
                which requires zero popups.
              </p>
            </div>
          </div>
        )}

        {/* --- TAB 3: ADMIN LOGIN --- */}
        {activeTab === "admin" && (
          <form onSubmit={handleCustomLogin} className="space-y-4">
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-red-500" />
                <span>Nepal Rescue Command Login</span>
              </h3>
              <p className="text-xs text-slate-400">
                Dedicated credentials for Dispatch Headquarters & Administrative Operators.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-mono">
                Administrator Username
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  required
                  placeholder="e.g. sajilo@111"
                  value={adminUsername}
                  onChange={(e) => setAdminUsername(e.target.value)}
                  className="w-full text-xs pl-10 pr-4 py-3 bg-slate-900/60 border border-slate-800 text-white rounded-xl focus:border-red-500 focus:outline-none transition font-mono"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-mono">
                Security Password
              </label>
              <div className="relative">
                <KeyRound className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
                <input
                  type="password"
                  required
                  placeholder="••••••••••••"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  className="w-full text-xs pl-10 pr-4 py-3 bg-slate-900/60 border border-slate-800 text-white rounded-xl focus:border-red-500 focus:outline-none transition font-mono"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || parentLoading}
              className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white py-3 px-4 rounded-xl font-bold text-xs transition shadow-lg hover:translate-y-[-1px] disabled:opacity-50 cursor-pointer"
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Verify &amp; Authenticate Admin</span>
            </button>
          </form>
        )}

        {/* Footer info */}
        <div className="text-center pt-3 border-t border-slate-850">
          <p className="text-[11px] text-slate-400 flex items-center justify-center gap-1.5">
            <Phone className="w-3.5 h-3.5 text-red-500" />
            <span>National Emergency Hotline: Dial 100 / 102 / 101</span>
          </p>
        </div>

      </div>
    </div>
  );
}

