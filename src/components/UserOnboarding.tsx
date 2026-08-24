import React, { useState } from "react";
import { UserRole, UserProfile } from "../types";
import { doc, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import { Shield, Heart, ArrowRight, UserCheck, AlertCircle } from "lucide-react";
import CountryPhoneInput from "./CountryPhoneInput";
import { validatePhoneNumber } from "../utils/phoneValidator";

interface UserOnboardingProps {
  uid: string;
  email: string;
  onComplete: (profile: UserProfile) => void;
}

export default function UserOnboarding({ uid, email, onComplete }: UserOnboardingProps) {
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [isPhoneValid, setIsPhoneValid] = useState(false);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [role, setRole] = useState<UserRole>("user");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Determine if logging email can register as admin
  const isAdminAllowed = email === "sajilobackendsupport@gmail.com";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!fullName.trim()) {
      setError("Please enter your Full Name.");
      return;
    }

    if (!phone.trim() || !isPhoneValid) {
      setError(
        phoneError ||
          "Please enter a valid contact phone number with the correct country code before continuing."
      );
      return;
    }

    setLoading(true);

    const initialProfile: UserProfile = {
      uid,
      email,
      fullName: fullName.trim(),
      phone: phone.trim(),
      role: isAdminAllowed ? role : "user",
      status: "normal",
      updatedAt: new Date().toISOString(),
    };

    try {
      // Set user record in Firestore
      await setDoc(doc(db, "users", uid), initialProfile);
      // Backup in localStorage
      localStorage.setItem(`khoji_user_${uid}`, JSON.stringify(initialProfile));
      onComplete(initialProfile);
    } catch (err) {
      console.warn("Firestore onboarding register failed, storing in local-first secure fallback...", err);
      // Even if Firestore fails, local fallback saves user profile and succeeds onboarding
      localStorage.setItem(`khoji_user_${uid}`, JSON.stringify(initialProfile));
      onComplete(initialProfile);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans" id="onboarding-root">
      <div className="bg-white rounded-3xl border border-slate-100 shadow-xl max-w-lg w-full overflow-hidden">
        {/* Onboarding top banner */}
        <div className="bg-slate-900 p-8 text-white text-center space-y-2">
          <div className="w-12 h-12 bg-red-600 rounded-2xl flex items-center justify-center text-white mx-auto shadow-lg shadow-red-950">
            <UserCheck className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-extrabold tracking-tight">Setup Citizen Profile • Khoji</h2>
          <p className="text-xs text-slate-400">Complete profile declaration for immediate response registration in Nepal.</p>
        </div>

        {/* Form panel */}
        <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-6">
          {error && (
            <div className="p-3 bg-red-50 text-red-800 text-xs font-bold border border-red-100 rounded-xl flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-4">
            
            {/* Full name */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
                <span>👤 Full Name *</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Sajilo Support, Aayush Shrestha"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full text-sm px-4 py-3 border border-slate-200 rounded-xl outline-none focus:border-red-500 bg-slate-50 transition"
              />
            </div>

            {/* Telephone number with country selector and validation */}
            <CountryPhoneInput
              id="onboarding-phone-input"
              value={phone}
              label="Contact Phone Number"
              helperText="Emergency responders will use this number to contact and locate you."
              onChange={(formatted, valid, err) => {
                setPhone(formatted);
                setIsPhoneValid(valid);
                setPhoneError(err);
                if (valid && error) {
                  setError(null);
                }
              }}
              required={true}
              theme="light"
            />

            {/* Admin toggle if eligible */}
            <div className="space-y-2 border-t pt-4">
              <label className="text-xs font-bold text-slate-600 block">Dispatch Authority Role</label>
              
              {isAdminAllowed ? (
                <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-2xl space-y-3">
                  <div className="flex items-start gap-2.5">
                    <Shield className="text-indigo-600 w-5 h-5 mt-0.5" />
                    <div className="space-y-0.5">
                      <span className="text-xs font-bold text-indigo-900 block">Command Center Status Authenticated</span>
                      <p className="text-[11px] text-indigo-700">You are logged in with the official bootstrapped admin email: {email}.</p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
                      <input
                        type="radio"
                        name="onboarding-role"
                        value="admin"
                        checked={role === "admin"}
                        onChange={() => setRole("admin")}
                      />
                      <span>Register as Dispatch Admin</span>
                    </label>
                    <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
                      <input
                        type="radio"
                        name="onboarding-role"
                        value="user"
                        checked={role === "user"}
                        onChange={() => setRole("user")}
                      />
                      <span>Register as Standard Citizen</span>
                    </label>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-50 border border-slate-100 p-3.5 rounded-2xl flex items-start gap-2.5">
                  <Heart className="text-rose-500 w-5 h-5 mt-0.5" />
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-slate-700 block">Standard Citizen Access (Public)</span>
                    <p className="text-[10.5px] text-slate-500">
                      You are registering as a tracker user. Secured admin controls are provisioned specifically to Nepalese Rescue Headquarters accounts.
                    </p>
                  </div>
                </div>
              )}
            </div>

          </div>

          {/* Form Actions */}
          <button
            type="submit"
            disabled={loading || (!isPhoneValid && phone.trim().length > 0)}
            className="w-full bg-red-600 hover:bg-red-700 transition font-extrabold text-sm text-white py-3.5 rounded-xl shadow-lg shadow-red-100 flex items-center justify-center gap-2 hover:translate-y-[-1px] disabled:opacity-50 cursor-pointer"
          >
            <span>{loading ? "Registering..." : "Finalize Profile Registration"}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
