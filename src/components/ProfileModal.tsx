import React, { useState, useEffect } from "react";
import { UserProfile } from "../types";
import {
  getSavedProfiles,
  saveProfile,
  switchActiveProfile,
  deleteProfile,
} from "../utils/profileManager";
import CountryPhoneInput from "./CountryPhoneInput";
import {
  Users,
  UserPlus,
  Trash2,
  CheckCircle2,
  Shield,
  User,
  X,
  Phone,
  Mail,
  AlertTriangle,
  LogIn,
  KeyRound,
  ShieldAlert,
  ArrowRight,
  LogOut,
} from "lucide-react";

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentProfile: UserProfile;
  onProfileSwitched: (newProfile: UserProfile) => void;
  onProfileDeleted: (remaining: UserProfile[], newActive: UserProfile | null) => void;
  onAddNewGoogleAccount: () => void;
  onLogoutCurrent: () => void;
}

export default function ProfileModal({
  isOpen,
  onClose,
  currentProfile,
  onProfileSwitched,
  onProfileDeleted,
  onAddNewGoogleAccount,
  onLogoutCurrent,
}: ProfileModalProps) {
  const [savedProfiles, setSavedProfiles] = useState<UserProfile[]>([]);
  const [activeTab, setActiveTab] = useState<"list" | "add-citizen" | "add-admin">("list");
  const [confirmDeleteUid, setConfirmDeleteUid] = useState<string | null>(null);

  // New Citizen Form State
  const [newCitizenName, setNewCitizenName] = useState("");
  const [newCitizenPhone, setNewCitizenPhone] = useState("");
  const [isCitizenPhoneValid, setIsCitizenPhoneValid] = useState(false);
  const [citizenPhoneError, setCitizenPhoneError] = useState<string | null>(null);
  const [newCitizenEmail, setNewCitizenEmail] = useState("");
  const [citizenError, setCitizenError] = useState<string | null>(null);

  // New Admin Form State
  const [adminUser, setAdminUser] = useState("");
  const [adminPass, setAdminPass] = useState("");
  const [adminError, setAdminError] = useState<string | null>(null);

  // Load profiles on open
  useEffect(() => {
    if (isOpen) {
      const profiles = getSavedProfiles();
      // Ensure current profile is in the list
      if (!profiles.some((p) => p.uid === currentProfile.uid)) {
        const updated = saveProfile(currentProfile, true);
        setSavedProfiles(updated);
      } else {
        setSavedProfiles(profiles);
      }
      setActiveTab("list");
      setConfirmDeleteUid(null);
      setCitizenError(null);
      setAdminError(null);
    }
  }, [isOpen, currentProfile]);

  if (!isOpen) return null;

  const handleSwitch = (p: UserProfile) => {
    if (p.uid === currentProfile.uid) {
      onClose();
      return;
    }
    const switched = switchActiveProfile(p.uid);
    if (switched) {
      onProfileSwitched(switched);
      onClose();
    }
  };

  const handleDelete = (uid: string) => {
    const { remaining, newActive } = deleteProfile(uid);
    setSavedProfiles(remaining);
    setConfirmDeleteUid(null);
    onProfileDeleted(remaining, newActive);
    if (!newActive || newActive.uid !== currentProfile.uid) {
      onClose();
    }
  };

  const handleCreateCitizen = (e: React.FormEvent) => {
    e.preventDefault();
    setCitizenError(null);

    if (!newCitizenName.trim()) {
      setCitizenError("Please enter full name.");
      return;
    }

    if (!newCitizenPhone.trim() || !isCitizenPhoneValid) {
      setCitizenError(
        citizenPhoneError || "Please enter a valid phone number with the country code."
      );
      return;
    }

    const newUid = `citizen-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    const newProfile: UserProfile = {
      uid: newUid,
      fullName: newCitizenName.trim(),
      phone: newCitizenPhone.trim(),
      email: newCitizenEmail.trim() || `${newCitizenName.toLowerCase().replace(/\s+/g, "")}@khoji.local`,
      role: "user",
      status: "normal",
      lastLocation: {
        lat: 27.7172 + (Math.random() - 0.5) * 0.04,
        lng: 85.324 + (Math.random() - 0.5) * 0.04,
        heading: Math.floor(Math.random() * 360),
        speed: 0,
        timestamp: new Date().toISOString(),
      },
      updatedAt: new Date().toISOString(),
    };

    const updatedList = saveProfile(newProfile, true);
    setSavedProfiles(updatedList);
    setNewCitizenName("");
    setNewCitizenPhone("");
    setNewCitizenEmail("");
    onProfileSwitched(newProfile);
    onClose();
  };

  const handleCreateAdmin = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminUser.trim() === "sajilo@111" && adminPass.trim() === "Nepal@111") {
      const adminProfile: UserProfile = {
        uid: "sajilo-admin-root",
        email: "sajilobackendsupport@gmail.com",
        fullName: "Sajilo Command Dispatcher",
        phone: "9851080000",
        role: "admin",
        status: "normal",
        updatedAt: new Date().toISOString(),
      };
      const updatedList = saveProfile(adminProfile, true);
      setSavedProfiles(updatedList);
      setAdminUser("");
      setAdminPass("");
      onProfileSwitched(adminProfile);
      onClose();
    } else {
      setAdminError("Invalid Admin credentials. Use username 'sajilo@111' with 'Nepal@111'.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in font-sans">
      <div className="bg-white rounded-3xl max-w-xl w-full border border-slate-100 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header banner */}
        <div className="bg-slate-900 px-6 py-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center text-white shadow-md">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base tracking-tight">Account & Profiles Manager</h3>
              <p className="text-xs text-slate-400">Switch profiles, register family members, or remove accounts.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center border-b border-slate-100 bg-slate-50 px-6 pt-3 gap-2">
          <button
            onClick={() => setActiveTab("list")}
            className={`px-4 py-2.5 text-xs font-extrabold rounded-t-xl transition flex items-center gap-1.5 border-b-2 ${
              activeTab === "list"
                ? "bg-white text-slate-900 border-red-600 shadow-sm"
                : "text-slate-500 hover:text-slate-900 border-transparent"
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Saved Profiles ({savedProfiles.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("add-citizen")}
            className={`px-4 py-2.5 text-xs font-extrabold rounded-t-xl transition flex items-center gap-1.5 border-b-2 ${
              activeTab === "add-citizen"
                ? "bg-white text-slate-900 border-red-600 shadow-sm"
                : "text-slate-500 hover:text-slate-900 border-transparent"
            }`}
          >
            <UserPlus className="w-3.5 h-3.5 text-blue-600" />
            <span>+ Add Citizen Profile</span>
          </button>

          <button
            onClick={() => setActiveTab("add-admin")}
            className={`px-4 py-2.5 text-xs font-extrabold rounded-t-xl transition flex items-center gap-1.5 border-b-2 ${
              activeTab === "add-admin"
                ? "bg-white text-slate-900 border-red-600 shadow-sm"
                : "text-slate-500 hover:text-slate-900 border-transparent"
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5 text-red-600" />
            <span>+ Add Admin Profile</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {/* TAB 1: SAVED PROFILES LIST */}
          {activeTab === "list" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-500 pb-1">
                <span>Select a profile to switch instantly without re-entering passwords:</span>
              </div>

              <div className="space-y-2.5">
                {savedProfiles.map((p) => {
                  const isActive = p.uid === currentProfile.uid;
                  const isAdmin = p.role === "admin";

                  return (
                    <div
                      key={p.uid}
                      className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                        isActive
                          ? "bg-red-50/50 border-red-200 shadow-sm ring-1 ring-red-300"
                          : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/70"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shadow-sm flex-shrink-0 ${
                            isAdmin
                              ? "bg-red-600 text-white"
                              : "bg-slate-900 text-white"
                          }`}
                        >
                          {isAdmin ? <Shield className="w-5 h-5" /> : <User className="w-5 h-5" />}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-sm text-slate-900 truncate">
                              {p.fullName || "Citizen User"}
                            </span>
                            <span
                              className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${
                                isAdmin
                                  ? "bg-red-100 text-red-800 border-red-200"
                                  : "bg-blue-100 text-blue-800 border-blue-200"
                              }`}
                            >
                              {isAdmin ? "Admin Dispatch" : "Citizen"}
                            </span>
                            {p.emailVerified && (
                              <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                                <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                                <span>Gmail Verified</span>
                              </span>
                            )}
                            {isActive && (
                              <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-slate-900 text-white border border-slate-800 flex items-center gap-1">
                                <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
                                <span>Active</span>
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-0.5">
                            {p.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3 text-slate-400" />{p.phone}</span>}
                            {p.email && <span className="flex items-center gap-1 truncate"><Mail className="w-3 h-3 text-slate-400" />{p.email}</span>}
                          </div>
                        </div>
                      </div>

                      {/* Profile Actions */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {!isActive ? (
                          <button
                            onClick={() => handleSwitch(p)}
                            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition shadow-sm flex items-center gap-1 cursor-pointer"
                          >
                            <span>Switch</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        ) : (
                          <span className="text-[11px] font-bold text-emerald-600 px-2 py-1 bg-emerald-50 rounded-lg">
                            Current Active
                          </span>
                        )}

                        {/* Delete Profile button */}
                        {confirmDeleteUid === p.uid ? (
                          <div className="flex items-center gap-1 bg-rose-50 border border-rose-200 p-1 rounded-xl">
                            <span className="text-[10px] text-rose-700 font-bold px-1">Delete?</span>
                            <button
                              onClick={() => handleDelete(p.uid)}
                              className="px-2 py-1 bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-bold rounded-lg transition"
                            >
                              Yes
                            </button>
                            <button
                              onClick={() => setConfirmDeleteUid(null)}
                              className="px-2 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 text-[10px] font-bold rounded-lg transition"
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmDeleteUid(p.uid)}
                            title="Remove profile from this device"
                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Add Google Account Quick Trigger */}
              <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
                <button
                  onClick={() => {
                    onClose();
                    onAddNewGoogleAccount();
                  }}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  <LogIn className="w-3.5 h-3.5 text-blue-600" />
                  <span>Connect Google Account</span>
                </button>

                <button
                  onClick={() => {
                    onClose();
                    onLogoutCurrent();
                  }}
                  className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-3.5 py-2 text-rose-600 hover:bg-rose-50 text-xs font-bold rounded-xl border border-rose-200 transition cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Logout Current Session</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: ADD CITIZEN PROFILE */}
          {activeTab === "add-citizen" && (
            <form onSubmit={handleCreateCitizen} className="space-y-4">
              <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 text-xs text-blue-900 space-y-1">
                <span className="font-bold flex items-center gap-1.5">
                  <UserPlus className="w-4 h-4 text-blue-600" />
                  Add Family Member or Secondary Citizen Profile
                </span>
                <p className="text-blue-700">
                  Register another citizen tracker profile on this device. You can switch between them at any time with one click.
                </p>
              </div>

              {citizenError && (
                <div className="p-3 bg-rose-50 text-rose-800 text-xs font-bold rounded-xl border border-rose-100">
                  {citizenError}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sita Shrestha, Ramesh Thapa"
                  value={newCitizenName}
                  onChange={(e) => setNewCitizenName(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 border border-slate-200 rounded-xl focus:border-red-500 focus:outline-none bg-slate-50"
                />
              </div>

              {/* Country Selection & Phone Input with strict validation */}
              <CountryPhoneInput
                id="modal-citizen-phone-input"
                value={newCitizenPhone}
                label="Contact Phone Number"
                helperText="Select country and enter a valid mobile number."
                onChange={(formatted, valid, err) => {
                  setNewCitizenPhone(formatted);
                  setIsCitizenPhoneValid(valid);
                  setCitizenPhoneError(err);
                  if (valid && citizenError) setCitizenError(null);
                }}
                required={true}
                theme="light"
              />

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Email Address (Optional)</label>
                <input
                  type="email"
                  placeholder="e.g. sita@example.com"
                  value={newCitizenEmail}
                  onChange={(e) => setNewCitizenEmail(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 border border-slate-200 rounded-xl focus:border-red-500 focus:outline-none bg-slate-50"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab("list")}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!isCitizenPhoneValid && newCitizenPhone.trim().length > 0}
                  className="px-5 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-extrabold rounded-xl transition shadow-md flex items-center gap-1.5 cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Save & Switch to Profile</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: ADD ADMIN PROFILE */}
          {activeTab === "add-admin" && (
            <form onSubmit={handleCreateAdmin} className="space-y-4">
              <div className="bg-red-50 border border-red-100 rounded-2xl p-4 text-xs text-red-900 space-y-1">
                <span className="font-bold flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-red-600" />
                  Add Dispatcher Administrator Account
                </span>
                <p className="text-red-700">
                  Authenticate with authorized dispatcher credentials to add the Admin Command console to your saved profiles list.
                </p>
              </div>

              {adminError && (
                <div className="p-3 bg-rose-50 text-rose-800 text-xs font-bold rounded-xl border border-rose-100">
                  {adminError}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 font-mono">Admin Username</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. sajilo@111"
                    value={adminUser}
                    onChange={(e) => setAdminUser(e.target.value)}
                    className="w-full text-xs pl-9 pr-3 py-2.5 border border-slate-200 rounded-xl focus:border-red-500 focus:outline-none bg-slate-50 font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 font-mono">Admin Security Password</label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="password"
                    required
                    placeholder="••••••••••••"
                    value={adminPass}
                    onChange={(e) => setAdminPass(e.target.value)}
                    className="w-full text-xs pl-9 pr-3 py-2.5 border border-slate-200 rounded-xl focus:border-red-500 focus:outline-none bg-slate-50 font-mono"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab("list")}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-extrabold rounded-xl transition shadow-md flex items-center gap-1.5"
                >
                  <Shield className="w-3.5 h-3.5" />
                  <span>Authenticate & Add Admin</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
