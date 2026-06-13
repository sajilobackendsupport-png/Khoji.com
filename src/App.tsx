import { useState, useEffect } from "react";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "./firebase";
import { UserProfile, UserRole } from "./types";
import AuthScreen from "./components/AuthScreen";
import UserOnboarding from "./components/UserOnboarding";
import UserDashboard from "./components/UserDashboard";
import AdminDashboard from "./components/AdminDashboard";
import { Shield } from "lucide-react";

export default function App() {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Controls dynamic sandbox/demo mode for rapid previewing
  const [demoMode, setDemoMode] = useState<"real" | "legacy-demo">("real");

  // Subscribe to Firebase Authentication changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      
      if (user) {
        setDemoMode("real");
        try {
          // Fetch existing user profile
          const docRef = doc(db, "users", user.uid);
          const snap = await getDoc(docRef);
          
          if (snap.exists()) {
            const profileData = snap.data() as UserProfile;
            setProfile(profileData);
            localStorage.setItem(`khoji_user_${user.uid}`, JSON.stringify(profileData));
          } else {
            // Check local fallback
            const localUser = localStorage.getItem(`khoji_user_${user.uid}`);
            if (localUser) {
              setProfile(JSON.parse(localUser));
            } else {
              setProfile(null);
            }
          }
        } catch (error) {
          console.error("Error reading Firestore profile of active user: attempting secure local storage fallback", error);
          const localUser = localStorage.getItem(`khoji_user_${user.uid}`);
          if (localUser) {
            setProfile(JSON.parse(localUser));
          } else {
            setProfile(null);
          }
        }
      } else {
        if (demoMode === "real") {
          setProfile(null);
        }
      }
      setLoading(false);
    });

    return unsubscribe;
  }, [demoMode]);

  // Handler for custom local testing sandbox logins
  const handleSandboxAccess = (mode: "real" | "legacy-demo", mockRole?: "user" | "admin") => {
    setLoading(true);
    setDemoMode(mode);

    if (mode === "legacy-demo") {
      // Mock profiles to test standard interactions in separate simulated routes
      const mockProfile: UserProfile =
        mockRole === "admin"
          ? {
              uid: "sandbox-admin",
              email: "Khoji@2026",
              fullName: "Khoji Administrator",
              phone: "9708547685",
              role: "admin",
              status: "normal",
              lastLocation: { lat: 27.7172, lng: 85.3240, timestamp: new Date().toISOString() },
              updatedAt: new Date().toISOString(),
            }
          : {
              uid: "sandbox-citizen",
              email: "citizen@khoji.com",
              fullName: "Citizen Responder (Sandbox Visitor)",
              phone: "9851080002",
              role: "user",
              status: "normal",
              lastLocation: { lat: 27.7172, lng: 85.3240, timestamp: new Date().toISOString() },
              updatedAt: new Date().toISOString(),
            };

      setProfile(mockProfile);
      setLoading(false);
    } else {
      setProfile(null);
      setFirebaseUser(null);
      setLoading(false);
    }
  };

  // Sign out handler (works synchronously for sandbox as well)
  const handleLogout = async () => {
    setLoading(true);
    if (demoMode === "real") {
      try {
        await signOut(auth);
      } catch (err) {
        console.error("Firebase Signout rejection:", err);
      }
    }
    setProfile(null);
    setFirebaseUser(null);
    setDemoMode("real");
    setLoading(false);
  };

  // Onboarding successfully completed
  const handleOnboardingComplete = (completedProfile: UserProfile) => {
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
          <h3 className="text-sm font-bold text-slate-100 uppercase tracking-widest font-mono">Initializing GPS Tracker</h3>
          <p className="text-xs text-slate-400">Securing location coordinates of Nepal help desk...</p>
        </div>
      </div>
    );
  }

  // --- 1. RENDER MAIN AUTH FOR UNAUTHENTICATED USERS ---
  if (!profile && !firebaseUser) {
    return <AuthScreen onSandboxToggle={handleSandboxAccess} isLoading={loading} />;
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

  // --- 3. RENDER ADMIN DASHBOARD ---
  if (profile && profile.role === "admin") {
    return <AdminDashboard adminUser={profile} onLogout={handleLogout} />;
  }

  // --- 4. RENDER USER DASHBOARD ---
  return <UserDashboard user={profile} onLogout={handleLogout} />;
}
