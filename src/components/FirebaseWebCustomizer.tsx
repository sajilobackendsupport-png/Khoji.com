import React, { useState, useEffect } from "react";
import {
  SiteConfig,
  NepalEmergencyContact,
  QuickMapRegion,
  CrisisGuideItem,
  ThemeColor,
} from "../types";
import {
  saveSiteConfigToFirebase,
  resetSiteConfigToDefault,
  DEFAULT_SITE_CONFIG,
} from "../utils/siteConfig";
import {
  Palette,
  Megaphone,
  PhoneCall,
  Map,
  FileText,
  Sliders,
  Code2,
  Save,
  RotateCcw,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  AlertTriangle,
  Info,
  Shield,
  Eye,
  Sparkles,
  ExternalLink,
  Flame,
  Ambulance,
  Phone,
  Radio,
  CheckCircle2,
  Copy,
} from "lucide-react";

interface FirebaseWebCustomizerProps {
  currentConfig: SiteConfig;
  adminName: string;
  onConfigSaved?: (newConfig: SiteConfig) => void;
  onClose?: () => void;
}

const THEME_OPTIONS: { id: ThemeColor; name: string; bg: string; text: string; ring: string }[] = [
  { id: "red", name: "Nepal Crimson Red", bg: "bg-red-600", text: "text-red-600", ring: "ring-red-500" },
  { id: "crimson", name: "Deep Scarlet", bg: "bg-rose-700", text: "text-rose-700", ring: "ring-rose-600" },
  { id: "blue", name: "Rescue Royal Blue", bg: "bg-blue-600", text: "text-blue-600", ring: "ring-blue-500" },
  { id: "emerald", name: "Disaster Safety Green", bg: "bg-emerald-600", text: "text-emerald-600", ring: "ring-emerald-500" },
  { id: "amber", name: "Emergency Warning Gold", bg: "bg-amber-600", text: "text-amber-600", ring: "ring-amber-500" },
  { id: "indigo", name: "Command Indigo", bg: "bg-indigo-600", text: "text-indigo-600", ring: "ring-indigo-500" },
  { id: "purple", name: "Tactical Purple", bg: "bg-purple-600", text: "text-purple-600", ring: "ring-purple-500" },
  { id: "slate", name: "Military Tactical Slate", bg: "bg-slate-800", text: "text-slate-800", ring: "ring-slate-700" },
];

export default function FirebaseWebCustomizer({
  currentConfig,
  adminName,
  onConfigSaved,
  onClose,
}: FirebaseWebCustomizerProps) {
  // Working draft state
  const [config, setConfig] = useState<SiteConfig>(currentConfig);
  const [activeTab, setActiveTab] = useState<
    "branding" | "banner" | "contacts" | "map" | "protocols" | "guides" | "features" | "raw"
  >("branding");

  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [copiedJson, setCopiedJson] = useState(false);
  const [jsonInput, setJsonInput] = useState(JSON.stringify(currentConfig, null, 2));
  const [jsonParseError, setJsonParseError] = useState<string | null>(null);

  // New Contact Form state
  const [isAddingContact, setIsAddingContact] = useState(false);
  const [editingContactId, setEditingContactId] = useState<string | null>(null);
  const [newContact, setNewContact] = useState<Partial<NepalEmergencyContact>>({
    name: "",
    number: "",
    description: "",
    location: "Kathmandu, Nepal",
    icon: "police",
    category: "national",
    enabled: true,
  });

  // New Region Form state
  const [isAddingRegion, setIsAddingRegion] = useState(false);
  const [newRegion, setNewRegion] = useState<Partial<QuickMapRegion>>({
    name: "",
    lat: 27.7172,
    lng: 85.324,
    zoom: 13,
    description: "",
  });

  // New Guide Form state
  const [isAddingGuide, setIsAddingGuide] = useState(false);
  const [newGuide, setNewGuide] = useState<Partial<CrisisGuideItem>>({
    title: "",
    category: "General Safety",
    summary: "",
    steps: [""],
    helpline: "100",
  });

  // Sync state if prop changes externally
  useEffect(() => {
    setConfig(currentConfig);
    setJsonInput(JSON.stringify(currentConfig, null, 2));
  }, [currentConfig]);

  // Handle Save
  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      await saveSiteConfigToFirebase(config, adminName);
      setSaveSuccess(true);
      if (onConfigSaved) onConfigSaved(config);
      setTimeout(() => setSaveSuccess(false), 3500);
    } catch (err: any) {
      console.error("Save config error:", err);
      setSaveError(err?.message || "Failed to save configuration to Firebase Firestore.");
    } finally {
      setSaving(false);
    }
  };

  // Handle Reset
  const handleReset = async () => {
    if (window.confirm("Are you sure you want to reset all web customizations to factory defaults?")) {
      setSaving(true);
      try {
        const resetData = await resetSiteConfigToDefault(adminName);
        setConfig(resetData);
        setJsonInput(JSON.stringify(resetData, null, 2));
        setSaveSuccess(true);
        if (onConfigSaved) onConfigSaved(resetData);
        setTimeout(() => setSaveSuccess(false), 3000);
      } catch (err: any) {
        setSaveError("Failed to reset config: " + err?.message);
      } finally {
        setSaving(false);
      }
    }
  };

  // Apply JSON raw changes
  const handleApplyJson = () => {
    try {
      const parsed = JSON.parse(jsonInput);
      setConfig(parsed);
      setJsonParseError(null);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (e: any) {
      setJsonParseError("Invalid JSON: " + e.message);
    }
  };

  // Contact Helpers
  const handleAddContact = () => {
    if (!newContact.name || !newContact.number) return;
    const item: NepalEmergencyContact = {
      id: `contact-${Date.now()}`,
      name: newContact.name || "Emergency Contact",
      number: newContact.number || "100",
      description: newContact.description || "",
      location: newContact.location || "Nepal",
      icon: (newContact.icon as any) || "general",
      category: (newContact.category as any) || "national",
      enabled: true,
    };
    const updated = [...config.contacts, item];
    setConfig({ ...config, contacts: updated });
    setIsAddingContact(false);
    setNewContact({
      name: "",
      number: "",
      description: "",
      location: "Kathmandu, Nepal",
      icon: "police",
      category: "national",
      enabled: true,
    });
  };

  const handleDeleteContact = (id: string | undefined) => {
    if (!id) return;
    const updated = config.contacts.filter((c) => c.id !== id);
    setConfig({ ...config, contacts: updated });
  };

  const handleToggleContactEnabled = (id: string | undefined) => {
    if (!id) return;
    const updated = config.contacts.map((c) =>
      c.id === id ? { ...c, enabled: c.enabled === false ? true : false } : c
    );
    setConfig({ ...config, contacts: updated });
  };

  // Region Helpers
  const handleAddRegion = () => {
    if (!newRegion.name || !newRegion.lat || !newRegion.lng) return;
    const item: QuickMapRegion = {
      id: `region-${Date.now()}`,
      name: newRegion.name,
      lat: Number(newRegion.lat),
      lng: Number(newRegion.lng),
      zoom: Number(newRegion.zoom || 13),
      description: newRegion.description || "",
    };
    setConfig({ ...config, quickRegions: [...config.quickRegions, item] });
    setIsAddingRegion(false);
    setNewRegion({ name: "", lat: 27.7172, lng: 85.324, zoom: 13, description: "" });
  };

  const handleDeleteRegion = (id: string) => {
    setConfig({ ...config, quickRegions: config.quickRegions.filter((r) => r.id !== id) });
  };

  // Guide Helpers
  const handleAddGuide = () => {
    if (!newGuide.title) return;
    const item: CrisisGuideItem = {
      id: `guide-${Date.now()}`,
      title: newGuide.title,
      category: newGuide.category || "General Safety",
      summary: newGuide.summary || "",
      steps: (newGuide.steps || []).filter((s) => s.trim().length > 0),
      helpline: newGuide.helpline || "100",
    };
    setConfig({ ...config, crisisGuides: [...config.crisisGuides, item] });
    setIsAddingGuide(false);
    setNewGuide({ title: "", category: "General Safety", summary: "", steps: [""], helpline: "100" });
  };

  const handleDeleteGuide = (id: string) => {
    setConfig({ ...config, crisisGuides: config.crisisGuides.filter((g) => g.id !== id) });
  };

  return (
    <div className="w-full bg-slate-900 text-slate-100 rounded-3xl border border-slate-800 shadow-2xl overflow-hidden flex flex-col font-sans" id="firebase-web-customizer-root">
      {/* Top Bar with Firebase Sync Badge & Save Actions */}
      <div className="bg-slate-950/90 px-6 py-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-500 to-red-600 flex items-center justify-center text-white shadow-lg">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black text-white tracking-tight">
                Firebase Web Customizer & Dynamic CMS
              </h2>
              <span className="text-[10px] font-mono font-bold uppercase bg-emerald-950 text-emerald-400 border border-emerald-800/80 px-2 py-0.5 rounded-full flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Firestore Live Sync
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Edit site branding, broadcast banners, emergency hotlines & map presets in real time.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {onClose && (
            <button
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition border border-transparent hover:border-slate-700"
            >
              Exit Customizer
            </button>
          )}

          <button
            onClick={handleReset}
            disabled={saving}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-800 border border-slate-700 rounded-xl transition disabled:opacity-50 cursor-pointer"
            title="Reset to Factory Defaults"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Defaults</span>
          </button>

          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 text-xs font-extrabold text-white bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 rounded-xl shadow-lg shadow-red-950 transition hover:translate-y-[-1px] disabled:opacity-50 cursor-pointer"
          >
            {saving ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : saveSuccess ? (
              <CheckCircle2 className="w-4 h-4 text-white animate-bounce" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>{saving ? "Saving to Firebase..." : saveSuccess ? "Saved Live!" : "Save Changes"}</span>
          </button>
        </div>
      </div>

      {/* Notification status bar if save state */}
      {saveSuccess && (
        <div className="bg-emerald-950/80 border-b border-emerald-800 text-emerald-300 px-6 py-2 text-xs font-bold flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Success: All web customizations written to Firebase Firestore (`app_config/site_settings`) and broadcast live.</span>
          </div>
          <span className="text-[10px] font-mono text-emerald-400">Updated: {new Date().toLocaleTimeString()}</span>
        </div>
      )}

      {saveError && (
        <div className="bg-red-950/90 border-b border-red-800 text-red-300 px-6 py-2 text-xs font-bold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <span>{saveError}</span>
          </div>
          <button onClick={() => setSaveError(null)} className="text-red-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Body with Tabs Navigation & Content */}
      <div className="flex flex-col lg:flex-row flex-1 min-h-[600px]">
        {/* Navigation Sidebar */}
        <div className="w-full lg:w-64 bg-slate-950/50 p-4 border-b lg:border-b-0 lg:border-r border-slate-800 flex flex-row lg:flex-col gap-1.5 overflow-x-auto">
          <button
            onClick={() => setActiveTab("branding")}
            className={`flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-bold rounded-xl transition text-left whitespace-nowrap cursor-pointer ${
              activeTab === "branding"
                ? "bg-red-600 text-white shadow-md"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
            }`}
          >
            <Palette className="w-4 h-4 flex-shrink-0" />
            <span>1. Branding & Theme</span>
          </button>

          <button
            onClick={() => setActiveTab("banner")}
            className={`flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-bold rounded-xl transition text-left whitespace-nowrap cursor-pointer ${
              activeTab === "banner"
                ? "bg-red-600 text-white shadow-md"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
            }`}
          >
            <Megaphone className="w-4 h-4 flex-shrink-0" />
            <span>2. Broadcast Banner</span>
            {config.bannerEnabled && (
              <span className="w-2 h-2 rounded-full bg-amber-400 ml-auto animate-ping" />
            )}
          </button>

          <button
            onClick={() => setActiveTab("contacts")}
            className={`flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-bold rounded-xl transition text-left whitespace-nowrap cursor-pointer ${
              activeTab === "contacts"
                ? "bg-red-600 text-white shadow-md"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
            }`}
          >
            <PhoneCall className="w-4 h-4 flex-shrink-0" />
            <span>3. Emergency Hotlines</span>
            <span className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded-full ml-auto">
              {config.contacts.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("map")}
            className={`flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-bold rounded-xl transition text-left whitespace-nowrap cursor-pointer ${
              activeTab === "map"
                ? "bg-red-600 text-white shadow-md"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
            }`}
          >
            <Map className="w-4 h-4 flex-shrink-0" />
            <span>4. Map & Regions</span>
          </button>

          <button
            onClick={() => setActiveTab("protocols")}
            className={`flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-bold rounded-xl transition text-left whitespace-nowrap cursor-pointer ${
              activeTab === "protocols"
                ? "bg-red-600 text-white shadow-md"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
            }`}
          >
            <FileText className="w-4 h-4 flex-shrink-0" />
            <span>5. SOS Protocols</span>
          </button>

          <button
            onClick={() => setActiveTab("guides")}
            className={`flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-bold rounded-xl transition text-left whitespace-nowrap cursor-pointer ${
              activeTab === "guides"
                ? "bg-red-600 text-white shadow-md"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
            }`}
          >
            <Shield className="w-4 h-4 flex-shrink-0" />
            <span>6. Crisis Guides</span>
            <span className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded-full ml-auto">
              {config.crisisGuides.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("features")}
            className={`flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-bold rounded-xl transition text-left whitespace-nowrap cursor-pointer ${
              activeTab === "features"
                ? "bg-red-600 text-white shadow-md"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
            }`}
          >
            <Sliders className="w-4 h-4 flex-shrink-0" />
            <span>7. Features & Flags</span>
          </button>

          <button
            onClick={() => {
              setActiveTab("raw");
              setJsonInput(JSON.stringify(config, null, 2));
            }}
            className={`flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-bold rounded-xl transition text-left whitespace-nowrap cursor-pointer ${
              activeTab === "raw"
                ? "bg-red-600 text-white shadow-md"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
            }`}
          >
            <Code2 className="w-4 h-4 flex-shrink-0" />
            <span>8. Raw JSON / Backup</span>
          </button>

          {/* Quick Stats footer in sidebar */}
          <div className="hidden lg:block mt-auto pt-4 border-t border-slate-800 space-y-2">
            <div className="p-3 bg-slate-900/90 rounded-2xl border border-slate-800 text-[11px] space-y-1">
              <span className="text-slate-400 font-bold uppercase tracking-wider block font-mono text-[9px]">
                Firebase Document
              </span>
              <p className="font-mono text-amber-400 truncate">app_config/site_settings</p>
              <p className="text-slate-500 text-[10px]">
                Modified by: {config.updatedBy || "Admin"}
              </p>
            </div>
          </div>
        </div>

        {/* Tab Content Panel */}
        <div className="flex-1 p-6 md:p-8 overflow-y-auto max-h-[calc(100vh-220px)] space-y-6">
          {/* ================= TAB 1: BRANDING & THEME ================= */}
          {activeTab === "branding" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-base font-extrabold text-white">Site Branding & Visual Identity</h3>
                <p className="text-xs text-slate-400">
                  Configure site titles, headers, brand logo, command badge, and primary color palette.
                </p>
              </div>

              {/* Theme Color Selector */}
              <div className="space-y-2 bg-slate-950/60 p-5 rounded-2xl border border-slate-800">
                <label className="text-xs font-bold text-slate-300 block">
                  Primary Theme Accent Color
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {THEME_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setConfig({ ...config, themeColor: opt.id })}
                      className={`flex items-center gap-2.5 p-2.5 rounded-xl border transition text-left cursor-pointer ${
                        config.themeColor === opt.id
                          ? "border-white/80 bg-slate-900 ring-2 ring-amber-500"
                          : "border-slate-800 bg-slate-900/40 hover:bg-slate-900 hover:border-slate-700"
                      }`}
                    >
                      <span className={`w-4 h-4 rounded-full ${opt.bg} flex-shrink-0 shadow`} />
                      <span className="text-xs font-bold text-slate-200 truncate">{opt.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Text Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">Website Header Title</label>
                  <input
                    type="text"
                    value={config.siteTitle}
                    onChange={(e) => setConfig({ ...config, siteTitle: e.target.value })}
                    className="w-full text-xs px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl focus:border-red-500 focus:outline-none text-white"
                    placeholder="e.g. Khoji Nepal"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">Brand Logo Text</label>
                  <input
                    type="text"
                    value={config.brandLogoText}
                    onChange={(e) => setConfig({ ...config, brandLogoText: e.target.value })}
                    className="w-full text-xs px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl focus:border-red-500 focus:outline-none text-white font-mono"
                    placeholder="e.g. Khoji.com"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">Command Badge Tag</label>
                  <input
                    type="text"
                    value={config.badgeText}
                    onChange={(e) => setConfig({ ...config, badgeText: e.target.value })}
                    className="w-full text-xs px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl focus:border-red-500 focus:outline-none text-white uppercase font-bold"
                    placeholder="e.g. Nepal Command"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">Organization Name</label>
                  <input
                    type="text"
                    value={config.organizationName}
                    onChange={(e) => setConfig({ ...config, organizationName: e.target.value })}
                    className="w-full text-xs px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl focus:border-red-500 focus:outline-none text-white"
                    placeholder="e.g. Government of Nepal Emergency Command"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">Site Tagline / Subtitle</label>
                <input
                  type="text"
                  value={config.siteTagline}
                  onChange={(e) => setConfig({ ...config, siteTagline: e.target.value })}
                  className="w-full text-xs px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl focus:border-red-500 focus:outline-none text-white"
                  placeholder="e.g. Emergency SOS Dispatch & Live Citizen Tracking Network"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">Footer Legal & Dispatch Notice</label>
                <textarea
                  rows={2}
                  value={config.footerNotice}
                  onChange={(e) => setConfig({ ...config, footerNotice: e.target.value })}
                  className="w-full text-xs px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl focus:border-red-500 focus:outline-none text-white"
                  placeholder="Footer notice displayed on citizen and admin views"
                />
              </div>

              {/* Live Mini Preview Box */}
              <div className="space-y-2 pt-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block font-mono flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-amber-400" />
                  Live Branding Preview
                </span>
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 bg-red-600 rounded-xl flex items-center justify-center text-white font-bold shadow">
                      <Shield className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-extrabold text-white flex items-center gap-2">
                        <span>{config.brandLogoText}</span>
                        <span className="text-[9px] bg-red-600 text-white px-2 py-0.5 rounded-full font-bold uppercase">
                          {config.badgeText}
                        </span>
                      </h4>
                      <p className="text-[10px] text-slate-400 font-mono">{config.siteTagline}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================= TAB 2: BROADCAST BANNER ================= */}
          {activeTab === "banner" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-base font-extrabold text-white">Emergency Broadcast Ribbon</h3>
                <p className="text-xs text-slate-400">
                  Instantly publish urgent live announcements, storm alerts, and drills across all citizen screens.
                </p>
              </div>

              {/* Enable toggle */}
              <div className="flex items-center justify-between p-4 bg-slate-950/80 rounded-2xl border border-slate-800">
                <div className="space-y-0.5">
                  <span className="text-xs font-extrabold text-white block">
                    Broadcast Ribbon Active
                  </span>
                  <p className="text-[11px] text-slate-400">
                    When enabled, this message displays prominently at the top of every user and admin screen.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setConfig({ ...config, bannerEnabled: !config.bannerEnabled })}
                  className={`w-12 h-6 flex items-center rounded-full p-1 transition cursor-pointer ${
                    config.bannerEnabled ? "bg-red-600" : "bg-slate-800"
                  }`}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition ${
                      config.bannerEnabled ? "translate-x-6" : ""
                    }`}
                  />
                </button>
              </div>

              {/* Banner Type */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300 block">Banner Urgency Style</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { id: "critical", name: "🚨 Critical Emergency", color: "border-red-600 bg-red-950/40 text-red-300" },
                    { id: "warning", name: "⚠️ Warning Advisory", color: "border-amber-600 bg-amber-950/40 text-amber-300" },
                    { id: "info", name: "ℹ️ Public Notice", color: "border-blue-600 bg-blue-950/40 text-blue-300" },
                    { id: "drill", name: "🛡️ Safety Drill", color: "border-emerald-600 bg-emerald-950/40 text-emerald-300" },
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setConfig({ ...config, bannerType: t.id as any })}
                      className={`p-3 rounded-xl border text-xs font-bold transition text-left cursor-pointer ${
                        config.bannerType === t.id
                          ? `${t.color} ring-2 ring-white/40`
                          : "border-slate-800 bg-slate-950 text-slate-400 hover:bg-slate-900"
                      }`}
                    >
                      {t.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Message text */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">Broadcast Message Headline</label>
                <textarea
                  rows={3}
                  value={config.bannerText}
                  onChange={(e) => setConfig({ ...config, bannerText: e.target.value })}
                  className="w-full text-xs px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl focus:border-red-500 focus:outline-none text-white font-medium"
                  placeholder="e.g. ⚠️ WEATHER WARNING: Heavy cloudburst expected in Kathmandu Valley."
                />
              </div>

              {/* Action button */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">Action Button Text (Optional)</label>
                  <input
                    type="text"
                    value={config.bannerActionText || ""}
                    onChange={(e) => setConfig({ ...config, bannerActionText: e.target.value })}
                    className="w-full text-xs px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl focus:border-red-500 focus:outline-none text-white"
                    placeholder="e.g. View Safety Protocol"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">Action Link / Anchor</label>
                  <input
                    type="text"
                    value={config.bannerActionLink || ""}
                    onChange={(e) => setConfig({ ...config, bannerActionLink: e.target.value })}
                    className="w-full text-xs px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl focus:border-red-500 focus:outline-none text-white font-mono"
                    placeholder="e.g. #emergency-contacts or https://..."
                  />
                </div>
              </div>

              {/* Banner Live Preview */}
              <div className="space-y-2 pt-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block font-mono flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-amber-400" />
                  Live Banner Preview
                </span>
                <div
                  className={`p-3 rounded-2xl font-bold text-xs flex flex-wrap items-center justify-between gap-3 shadow-lg ${
                    config.bannerType === "critical"
                      ? "bg-rose-600 text-white animate-pulse"
                      : config.bannerType === "warning"
                      ? "bg-amber-600 text-slate-950"
                      : config.bannerType === "drill"
                      ? "bg-emerald-600 text-white"
                      : "bg-blue-600 text-white"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Radio className="w-4 h-4 flex-shrink-0 animate-ping" />
                    <span>{config.bannerText || "No broadcast text configured"}</span>
                  </div>
                  {config.bannerActionText && (
                    <span className="px-2.5 py-1 bg-black/30 hover:bg-black/40 text-white text-[11px] rounded-lg cursor-pointer">
                      {config.bannerActionText} →
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ================= TAB 3: EMERGENCY HOTLINES CMS ================= */}
          {activeTab === "contacts" && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-extrabold text-white">Emergency Helplines & Contacts CMS</h3>
                  <p className="text-xs text-slate-400">
                    Add, edit, reorder, or toggle official response phone numbers synced to Firebase.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddingContact(true)}
                  className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl transition shadow cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add New Helpline</span>
                </button>
              </div>

              {/* Add New Contact Drawer */}
              {isAddingContact && (
                <div className="p-5 bg-slate-950 rounded-2xl border-2 border-red-600/50 space-y-4 animate-fade-in">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-extrabold text-white uppercase tracking-wider">
                      ➕ Add New Emergency Service Hotline
                    </h4>
                    <button
                      onClick={() => setIsAddingContact(false)}
                      className="text-slate-400 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-400">Service Name *</label>
                      <input
                        type="text"
                        value={newContact.name}
                        onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                        className="w-full text-xs px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-red-500"
                        placeholder="e.g. Mountain Rescue Nepal"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-400">Phone / Hotline Number *</label>
                      <input
                        type="text"
                        value={newContact.number}
                        onChange={(e) => setNewContact({ ...newContact, number: e.target.value })}
                        className="w-full text-xs px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white font-mono focus:outline-none focus:border-red-500"
                        placeholder="e.g. 100, 102, 01-4412404"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-400">Headquarters / Location</label>
                      <input
                        type="text"
                        value={newContact.location}
                        onChange={(e) => setNewContact({ ...newContact, location: e.target.value })}
                        className="w-full text-xs px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-red-500"
                        placeholder="e.g. Baluwatar, Kathmandu"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-400">Category</label>
                      <select
                        value={newContact.category}
                        onChange={(e) => setNewContact({ ...newContact, category: e.target.value as any })}
                        className="w-full text-xs px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none"
                      >
                        <option value="national">National Emergency</option>
                        <option value="disaster">Disaster & Rescue</option>
                        <option value="hospital">Hospital & Medical</option>
                        <option value="local">Local & Municipal</option>
                      </select>
                    </div>

                    <div className="space-y-1 sm:col-span-2">
                      <label className="text-[11px] font-bold text-slate-400">Service Description</label>
                      <input
                        type="text"
                        value={newContact.description}
                        onChange={(e) => setNewContact({ ...newContact, description: e.target.value })}
                        className="w-full text-xs px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-red-500"
                        placeholder="e.g. 24/7 mountain search & rescue helicopter dispatch."
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      onClick={() => setIsAddingContact(false)}
                      className="px-3.5 py-1.5 text-xs text-slate-400 hover:text-white"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleAddContact}
                      className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition shadow"
                    >
                      Add Hotline to Firestore List
                    </button>
                  </div>
                </div>
              )}

              {/* List of Contacts */}
              <div className="space-y-2.5">
                {config.contacts.map((contact, idx) => (
                  <div
                    key={contact.id || idx}
                    className={`p-4 rounded-2xl border transition flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                      contact.enabled === false
                        ? "bg-slate-950/40 border-slate-800/60 opacity-60"
                        : "bg-slate-950 border-slate-800 hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-red-400 font-bold flex-shrink-0">
                        {contact.category === "hospital" ? (
                          <Ambulance className="w-5 h-5 text-emerald-400" />
                        ) : contact.category === "disaster" ? (
                          <Flame className="w-5 h-5 text-amber-400" />
                        ) : (
                          <Phone className="w-5 h-5 text-red-400" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-extrabold text-white">{contact.name}</h4>
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-red-950 text-red-300 border border-red-900 rounded-md">
                            {contact.number}
                          </span>
                          {contact.enabled === false && (
                            <span className="text-[9px] bg-slate-800 text-slate-400 px-1.5 py-0.2 rounded">
                              Disabled
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">{contact.description}</p>
                        <span className="text-[10px] text-slate-500 font-mono">📍 {contact.location}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <button
                        type="button"
                        onClick={() => handleToggleContactEnabled(contact.id)}
                        className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition border ${
                          contact.enabled === false
                            ? "bg-slate-900 text-slate-400 border-slate-800"
                            : "bg-emerald-950 text-emerald-300 border-emerald-800"
                        }`}
                      >
                        {contact.enabled === false ? "Enable" : "Active"}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteContact(contact.id)}
                        className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-slate-900 rounded-lg transition"
                        title="Delete Contact"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ================= TAB 4: MAP & REGIONS ================= */}
          {activeTab === "map" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-base font-extrabold text-white">Map Engine & Regional Presets</h3>
                <p className="text-xs text-slate-400">
                  Configure default GPS coordinates, initial zoom level, and regional jump buttons for dispatchers.
                </p>
              </div>

              {/* Center Coordinates & Zoom */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-950 p-5 rounded-2xl border border-slate-800">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">Default Latitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={config.defaultMapCenter.lat}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        defaultMapCenter: {
                          ...config.defaultMapCenter,
                          lat: parseFloat(e.target.value) || 27.7172,
                        },
                      })
                    }
                    className="w-full text-xs px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white font-mono focus:border-red-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">Default Longitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={config.defaultMapCenter.lng}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        defaultMapCenter: {
                          ...config.defaultMapCenter,
                          lng: parseFloat(e.target.value) || 85.324,
                        },
                      })
                    }
                    className="w-full text-xs px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white font-mono focus:border-red-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-slate-300">Default Zoom Level</label>
                    <span className="text-xs font-mono text-red-400 font-bold">
                      Level {config.defaultMapZoom}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="6"
                    max="18"
                    value={config.defaultMapZoom}
                    onChange={(e) =>
                      setConfig({ ...config, defaultMapZoom: parseInt(e.target.value) || 12 })
                    }
                    className="w-full accent-red-600 cursor-pointer mt-2"
                  />
                </div>
              </div>

              {/* Quick Regions Manager */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-extrabold text-white uppercase tracking-wider">
                    📍 Quick Regional Jump Buttons ({config.quickRegions.length})
                  </h4>
                  <button
                    onClick={() => setIsAddingRegion(true)}
                    className="flex items-center gap-1 text-xs font-bold text-red-400 hover:text-red-300 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Region</span>
                  </button>
                </div>

                {isAddingRegion && (
                  <div className="p-4 bg-slate-950 rounded-2xl border border-red-600/50 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                      <input
                        type="text"
                        placeholder="Region Name (e.g. Pokhara Valley)"
                        value={newRegion.name}
                        onChange={(e) => setNewRegion({ ...newRegion, name: e.target.value })}
                        className="text-xs px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white"
                      />
                      <input
                        type="number"
                        step="0.0001"
                        placeholder="Latitude"
                        value={newRegion.lat}
                        onChange={(e) => setNewRegion({ ...newRegion, lat: parseFloat(e.target.value) })}
                        className="text-xs px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white font-mono"
                      />
                      <input
                        type="number"
                        step="0.0001"
                        placeholder="Longitude"
                        value={newRegion.lng}
                        onChange={(e) => setNewRegion({ ...newRegion, lng: parseFloat(e.target.value) })}
                        className="text-xs px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white font-mono"
                      />
                      <input
                        type="number"
                        placeholder="Zoom (1-18)"
                        value={newRegion.zoom}
                        onChange={(e) => setNewRegion({ ...newRegion, zoom: parseInt(e.target.value) })}
                        className="text-xs px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white font-mono"
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setIsAddingRegion(false)}
                        className="text-xs text-slate-400 hover:text-white"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleAddRegion}
                        className="px-3 py-1 bg-red-600 text-white text-xs font-bold rounded-xl"
                      >
                        Save Region
                      </button>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {config.quickRegions.map((region) => (
                    <div
                      key={region.id}
                      className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between"
                    >
                      <div>
                        <h5 className="text-xs font-bold text-white">{region.name}</h5>
                        <p className="text-[10px] text-slate-400 font-mono">
                          {region.lat.toFixed(4)}, {region.lng.toFixed(4)} • Zoom {region.zoom}
                        </p>
                      </div>
                      <button
                        onClick={() => handleDeleteRegion(region.id)}
                        className="text-slate-500 hover:text-red-400 p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ================= TAB 5: SOS PROTOCOLS ================= */}
          {activeTab === "protocols" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-base font-extrabold text-white">Emergency SOS Response Protocols</h3>
                <p className="text-xs text-slate-400">
                  Customize instructions shown to citizens upon triggering specific emergency buttons.
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-red-400 flex items-center gap-1.5">
                    <span>🚨 Police & Armed Security SOS Protocol</span>
                  </label>
                  <textarea
                    rows={2}
                    value={config.sosProtocols.police}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        sosProtocols: { ...config.sosProtocols, police: e.target.value },
                      })
                    }
                    className="w-full text-xs px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl focus:border-red-500 focus:outline-none text-white"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                    <span>🔥 Fire Brigade & Structural Hazard Protocol</span>
                  </label>
                  <textarea
                    rows={2}
                    value={config.sosProtocols.fire}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        sosProtocols: { ...config.sosProtocols, fire: e.target.value },
                      })
                    }
                    className="w-full text-xs px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl focus:border-red-500 focus:outline-none text-white"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                    <span>🚑 Ambulance & Trauma Medical Protocol</span>
                  </label>
                  <textarea
                    rows={2}
                    value={config.sosProtocols.ambulance}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        sosProtocols: { ...config.sosProtocols, ambulance: e.target.value },
                      })
                    }
                    className="w-full text-xs px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl focus:border-red-500 focus:outline-none text-white"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-blue-400 flex items-center gap-1.5">
                    <span>📍 Lost Device / Missing Citizen Protocol</span>
                  </label>
                  <textarea
                    rows={2}
                    value={config.sosProtocols.lost}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        sosProtocols: { ...config.sosProtocols, lost: e.target.value },
                      })
                    }
                    className="w-full text-xs px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl focus:border-red-500 focus:outline-none text-white"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ================= TAB 6: CRISIS GUIDES ================= */}
          {activeTab === "guides" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-extrabold text-white">Crisis Safety & Survival Guides</h3>
                  <p className="text-xs text-slate-400">
                    Manage actionable step-by-step guides for earthquakes, landslides, and high altitude emergencies.
                  </p>
                </div>
                <button
                  onClick={() => setIsAddingGuide(true)}
                  className="flex items-center gap-1 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Guide</span>
                </button>
              </div>

              {/* Add Guide form */}
              {isAddingGuide && (
                <div className="p-5 bg-slate-950 rounded-2xl border border-red-600/50 space-y-3">
                  <h4 className="text-xs font-bold text-white uppercase">➕ Add Safety Protocol Guide</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      type="text"
                      placeholder="Guide Title (e.g. Flash Flood Survival)"
                      value={newGuide.title}
                      onChange={(e) => setNewGuide({ ...newGuide, title: e.target.value })}
                      className="text-xs px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white"
                    />
                    <input
                      type="text"
                      placeholder="Category (e.g. Monsoon Disaster)"
                      value={newGuide.category}
                      onChange={(e) => setNewGuide({ ...newGuide, category: e.target.value })}
                      className="text-xs px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white"
                    />
                  </div>
                  <textarea
                    rows={2}
                    placeholder="Short summary..."
                    value={newGuide.summary}
                    onChange={(e) => setNewGuide({ ...newGuide, summary: e.target.value })}
                    className="w-full text-xs px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setIsAddingGuide(false)}
                      className="text-xs text-slate-400 hover:text-white"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleAddGuide}
                      className="px-3.5 py-1.5 bg-red-600 text-white text-xs font-bold rounded-xl"
                    >
                      Save Guide
                    </button>
                  </div>
                </div>
              )}

              {/* Guides List */}
              <div className="space-y-4">
                {config.crisisGuides.map((guide) => (
                  <div
                    key={guide.id}
                    className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-2.5"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-[10px] font-mono text-red-400 font-bold uppercase">
                          {guide.category}
                        </span>
                        <h4 className="text-sm font-bold text-white">{guide.title}</h4>
                      </div>
                      <button
                        onClick={() => handleDeleteGuide(guide.id)}
                        className="text-slate-500 hover:text-red-400 p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="text-xs text-slate-400">{guide.summary}</p>
                    <div className="space-y-1 bg-slate-900/60 p-3 rounded-xl">
                      {guide.steps.map((st, sIdx) => (
                        <div key={sIdx} className="text-[11px] text-slate-300 flex items-start gap-2">
                          <span className="text-red-500 font-bold">•</span>
                          <span>{st}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ================= TAB 7: FEATURES & TOGGLES ================= */}
          {activeTab === "features" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-base font-extrabold text-white">System Feature Toggles</h3>
                <p className="text-xs text-slate-400">
                  Enable or disable emergency subsystems dynamically across the web app.
                </p>
              </div>

              <div className="space-y-3">
                {[
                  {
                    key: "enableAudioSiren",
                    label: "Live Emergency Siren Audio Engine",
                    desc: "Plays dispatcher alert alarm tones and acoustic sirens on critical SOS signals.",
                  },
                  {
                    key: "enableDesktopNotifications",
                    label: "Browser Desktop Push Notifications",
                    desc: "Enables background alerts even when the browser tab is minimized.",
                  },
                  {
                    key: "enableMultiDeviceTracking",
                    label: "Multi-Device & Fleet Tracking",
                    desc: "Allows a single citizen profile to pair and broadcast multiple device coordinates.",
                  },
                  {
                    key: "enablePublicGuestSOS",
                    label: "Guest 1-Click SOS Dispatch",
                    desc: "Allows unauthenticated users to trigger immediate emergency location broadcasting.",
                  },
                ].map((feat) => {
                  const isChecked = config.features[feat.key as keyof typeof config.features];
                  return (
                    <div
                      key={feat.key}
                      className="p-4 bg-slate-950 rounded-2xl border border-slate-800 flex items-center justify-between gap-4"
                    >
                      <div className="space-y-0.5">
                        <h4 className="text-xs font-bold text-white">{feat.label}</h4>
                        <p className="text-[11px] text-slate-400">{feat.desc}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setConfig({
                            ...config,
                            features: {
                              ...config.features,
                              [feat.key]: !isChecked,
                            },
                          })
                        }
                        className={`w-11 h-6 flex items-center rounded-full p-1 transition cursor-pointer ${
                          isChecked ? "bg-emerald-600" : "bg-slate-800"
                        }`}
                      >
                        <div
                          className={`bg-white w-4 h-4 rounded-full shadow-md transform transition ${
                            isChecked ? "translate-x-5" : ""
                          }`}
                        />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ================= TAB 8: RAW JSON / BACKUP ================= */}
          {activeTab === "raw" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-extrabold text-white">Raw Firestore JSON Schema</h3>
                  <p className="text-xs text-slate-400">
                    Inspect, copy, or manually edit the exact configuration stored in Firebase.
                  </p>
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(jsonInput);
                    setCopiedJson(true);
                    setTimeout(() => setCopiedJson(false), 2000);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copiedJson ? "Copied!" : "Copy JSON"}</span>
                </button>
              </div>

              {jsonParseError && (
                <div className="p-3 bg-red-950 border border-red-800 text-red-300 text-xs rounded-xl font-mono">
                  {jsonParseError}
                </div>
              )}

              <textarea
                rows={16}
                value={jsonInput}
                onChange={(e) => setJsonInput(e.target.value)}
                className="w-full text-xs font-mono p-4 bg-slate-950 border border-slate-800 rounded-2xl text-emerald-400 focus:outline-none focus:border-amber-500"
              />

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={handleApplyJson}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  Apply JSON Changes to Form
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
