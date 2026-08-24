import { useState, useEffect } from "react";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "./firebase";
import { UserProfile } from "./types";
import AuthScreen from "./components/AuthScreen";
import UserOnboarding from "./components/UserOnboarding";
import UserDashboard from "./components/UserDashboard";
import AdminDashboard from "./components/AdminDashboard";
import ProfileModal from "./components/ProfileModal";
import {
  getActiveProfile,
  getSavedProfiles,
  saveProfile,
  switchActiveProfile,
  deleteProfile,
  clearAllProfiles,
} from "./utils/profileManager";
import { subscribeSiteConfig } from "./utils/siteConfig";
import { Shield } from "lucide-react";

export default function App() {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [showAuthModalForNewAccount, setShowAuthModalForNewAccount] = useState(false);

  // Sync document title with Firebase site configuration in real time
  useEffect(() => {
    const unsub = subscribeSiteConfig((cfg) => {
      if (cfg.siteTitle) {
        document.title = cfg.siteTitle;
      }
    });
    return unsub;
  }, []);

  // Initialize session from saved profiles or Firebase Auth on mount
  useEffect(() => {
    // 1. First check if we have a locally stored active profile
    const activeStored = getActiveProfile();
    if (activeStored) {
      setProfile(activeStored);
      setLoading(false);
    }

    // 2. Listen to Firebase auth changes to reconcile Google sessions
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);

      if (user) {
        try {
          // Fetch existing user profile from Firestore or local cache
          const docRef = doc(db, "users", user.uid);
          const snap = await getDoc(docRef);

          if (snap.exists()) {
            const profileData = snap.data() as UserProfile;
            saveProfile(profileData, true);
            setProfile(profileData);
          } else {
            // Check if profile exists locally
            const localUser = localStorage.getItem(`khoji_user_${user.uid}`);
            if (localUser) {
              const parsed = JSON.parse(localUser);
              saveProfile(parsed, true);
              setProfile(parsed);
            } else {
              // User needs onboarding setup
              setProfile(null);
            }
          }
        } catch (error) {
          console.warn("Firestore profile fetch notice, falling back to local session:", error);
          const localUser = localStorage.getItem(`khoji_user_${user.uid}`);
          if (localUser) {
            const parsed = JSON.parse(localUser);
            saveProfile(parsed, true);
            setProfile(parsed);
          }
        }
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // Handler for custom local testing sandbox or custom admin logins
  const handleAuthAccess = (mode: "real" | "legacy-demo", mockRole?: "user" | "admin") => {
    setLoading(true);

    if (mode === "legacy-demo" && mockRole === "admin") {
      const adminProfile: UserProfile = {
        uid: "sajilo-admin-root",
        email: "sajilobackendsupport@gmail.com",
        fullName: "Sajilo Command Dispatcher",
        phone: "9851080000",
        role: "admin",
        status: "normal",
        updatedAt: new Date().toISOString(),
      };
      saveProfile(adminProfile, true);
      setProfile(adminProfile);
      setShowAuthModalForNewAccount(false);
      setLoading(false);
    } else {
      setShowAuthModalForNewAccount(false);
      setLoading(false);
    }
  };

  // Switch active profile
  const handleProfileSwitched = (newProfile: UserProfile) => {
    switchActiveProfile(newProfile.uid);
    setProfile(newProfile);
  };

  // Delete profile
  const handleProfileDeleted = (remaining: UserProfile[], newActive: UserProfile | null) => {
    setProfile(newActive);
  };

  // Logout current active profile
  const handleLogout = async () => {
    setLoading(true);
    if (profile) {
      const { newActive } = deleteProfile(profile.uid);
      setProfile(newActive);
    }
    try {
      await signOut(auth);
    } catch (err) {
      console.warn("Sign out notice:", err);
    }
    setFirebaseUser(null);
    setLoading(false);
  };

  // Onboarding successfully completed
  const handleOnboardingComplete = (completedProfile: UserProfile) => {
    saveProfile(completedProfile, true);
    setProfile(completedProfile);
  };

  // Render full-body centered spinning loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 gap-4" id="app-loading-screen">
        <div className="w-12 h-12 bg-red-600 rounded-2xl flex items-center justify-center text-white shadow-xl animate-pulse">
          <Shield className="w-6 h-6 animate-spin text-white" />
        </div>
        <div className="text-center space-y-1">
          <h3 className="text-sm font-bold text-slate-100 uppercase tracking-widest font-mono">Restoring Secure Session</h3>
          <p className="text-xs text-slate-400">Loading your profile & Nepal emergency network...</p>
        </div>
      </div>
    );
  }

  // --- 1. RENDER MAIN AUTH FOR UNAUTHENTICATED USERS OR WHEN EXPLICITLY ADDING AN ACCOUNT ---
  if ((!profile && !firebaseUser) || showAuthModalForNewAccount) {
    return (
      <>
        <AuthScreen
          onSandboxToggle={handleAuthAccess}
          isLoading={loading}
        />
        {showAuthModalForNewAccount && profile && (
          <button
            onClick={() => setShowAuthModalForNewAccount(false)}
            className="fixed top-4 right-4 z-50 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl border border-slate-700 shadow-xl transition"
          >
            ← Return to {profile.fullName}
          </button>
        )}
      </>
    );
  }

  // --- 2. RENDER PROFILE CREATION ONBOARDING FOR NEW REAL USERS ---
  if (firebaseUser && !profile) {
    return (
      <UserOnboarding
        uid={firebaseUser.uid}
        email={firebaseUser.email || ""}
        onComplete={handleOnboardingComplete}
      />
    );
  }

  // --- 3. RENDER DASHBOARDS WITH PROFILE SWITCHER MODAL ---
  return (
    <>
      {profile && profile.role === "admin" ? (
        <AdminDashboard
          adminUser={profile}
          onLogout={handleLogout}
          onOpenProfileModal={() => setIsProfileModalOpen(true)}
        />
      ) : (
        profile && (
          <UserDashboard
            user={profile}
            onLogout={handleLogout}
            onOpenProfileModal={() => setIsProfileModalOpen(true)}
          />
        )
      )}

      {/* Global Profile Switcher / Account Manager Modal */}
      {profile && (
        <ProfileModal
          isOpen={isProfileModalOpen}
          onClose={() => setIsProfileModalOpen(false)}
          currentProfile={profile}
          onProfileSwitched={handleProfileSwitched}
          onProfileDeleted={handleProfileDeleted}
          onAddNewGoogleAccount={() => setShowAuthModalForNewAccount(true)}
          onLogoutCurrent={handleLogout}
        />
      )}
    </>
  );
}
