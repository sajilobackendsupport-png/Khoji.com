import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Phone,
  Radio,
  MapPin,
  CheckSquare,
  VolumeX,
  Volume2,
  X,
  ArrowRight,
  Pause,
  Play,
  RotateCcw,
  Zap,
  ExternalLink,
  ChevronDown,
  Navigation,
  Smartphone,
  ShieldAlert,
  Building2,
  Compass,
  Activity,
  Clock,
  Car,
} from "lucide-react";
import { EmergencyAlert, UserProfile } from "../types";
import {
  identifyEmergencyAndTarget,
  NEPAL_DISPATCH_AUTHORITIES,
  EmergencyTriageResult,
} from "../utils/emergencyTriage";
import {
  findNearestEmergencyProviders,
  getNearestProviderForAlert,
  NearestProviderResult,
} from "../utils/nearestEmergencyProviders";

interface EmergencyNotificationModalProps {
  alert: EmergencyAlert | null;
  userProfile?: UserProfile | null;
  onClose: () => void;
  onResolve: (alert: EmergencyAlert) => void;
  onCenterMap: (alert: EmergencyAlert) => void;
  onSilenceSiren: () => void;
  isSirenPlaying?: boolean;
  isLoading?: boolean;
}

const DEFAULT_REDIRECT_SECONDS = 6;

export const EmergencyNotificationModal: React.FC<EmergencyNotificationModalProps> = ({
  alert,
  userProfile,
  onClose,
  onResolve,
  onCenterMap,
  onSilenceSiren,
  isSirenPlaying = false,
  isLoading = false,
}) => {
  if (!alert) return null;

  // 1. Automatically triage & identify emergency authority
  const triage: EmergencyTriageResult = identifyEmergencyAndTarget(alert);

  // 2. Resolve user's device info
  const matchedDevice =
    userProfile?.devices && alert.deviceId
      ? userProfile.devices[alert.deviceId]
      : null;
  const deviceDisplayName =
    matchedDevice?.deviceName ||
    (alert.deviceId ? `Device (${alert.deviceId.substring(0, 8)})` : "Primary Citizen Device");

  // 3. Compute nearest emergency service providers based on emergent user's GPS coordinates
  const nearestTopResult = useMemo(() => {
    return getNearestProviderForAlert(alert);
  }, [alert.location?.lat, alert.location?.lng, alert.type, alert.details]);

  const nearbyProvidersList = useMemo(() => {
    const lat = alert.location?.lat || 27.7172;
    const lng = alert.location?.lng || 85.324;
    return findNearestEmergencyProviders(lat, lng, "all", 4);
  }, [alert.location?.lat, alert.location?.lng]);

  // Call destination mode: "NEAREST_PROVIDER" (default for proximity routing) | "USER_DEVICE" | "NATIONAL_HOTLINE"
  const [callTargetMode, setCallTargetMode] = useState<
    "NEAREST_PROVIDER" | "USER_DEVICE" | "NATIONAL_HOTLINE"
  >("NEAREST_PROVIDER");

  // State for manual selected authority override
  const [selectedAuthority, setSelectedAuthority] = useState<{
    name: string;
    number: string;
    category: string;
  }>({
    name: nearestTopResult?.provider.name || triage.primaryAuthority,
    number: nearestTopResult?.provider.phone || triage.primaryPhone,
    category: nearestTopResult?.provider.categoryLabel || triage.categoryLabel,
  });

  const [showNearbyList, setShowNearbyList] = useState(false);
  const [showAuthorityDropdown, setShowAuthorityDropdown] = useState(false);
  const [autoRedirectEnabled, setAutoRedirectEnabled] = useState(true);
  const [countdown, setCountdown] = useState<number>(DEFAULT_REDIRECT_SECONDS);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [callInitiated, setCallInitiated] = useState(false);
  const [activeDialedNumber, setActiveDialedNumber] = useState<string>("");

  const countdownTimerRef = useRef<any>(null);

  // Effective phone number to dial based on selected mode
  const activePhoneNumber = useMemo(() => {
    if (callTargetMode === "NEAREST_PROVIDER") {
      return nearestTopResult?.provider.phone || selectedAuthority.number;
    }
    if (callTargetMode === "USER_DEVICE") {
      return alert.userPhone;
    }
    return triage.primaryPhone;
  }, [callTargetMode, nearestTopResult, selectedAuthority.number, alert.userPhone, triage.primaryPhone]);

  const activeTargetName = useMemo(() => {
    if (callTargetMode === "NEAREST_PROVIDER") {
      return nearestTopResult
        ? `${nearestTopResult.provider.name} (${nearestTopResult.distanceFormatted})`
        : selectedAuthority.name;
    }
    if (callTargetMode === "USER_DEVICE") {
      return `${alert.userName} (${deviceDisplayName})`;
    }
    return `${triage.primaryAuthority} (${triage.primaryPhone})`;
  }, [callTargetMode, nearestTopResult, selectedAuthority.name, alert.userName, deviceDisplayName, triage]);

  // Re-sync when alert changes
  useEffect(() => {
    setCallTargetMode("NEAREST_PROVIDER");
    if (nearestTopResult) {
      setSelectedAuthority({
        name: nearestTopResult.provider.name,
        number: nearestTopResult.provider.phone,
        category: nearestTopResult.provider.categoryLabel,
      });
    } else {
      setSelectedAuthority({
        name: triage.primaryAuthority,
        number: triage.primaryPhone,
        category: triage.categoryLabel,
      });
    }
    setCountdown(DEFAULT_REDIRECT_SECONDS);
    setAutoRedirectEnabled(true);
    setIsRedirecting(false);
    setCallInitiated(false);
    setActiveDialedNumber("");
  }, [alert.id, alert.location?.lat, alert.location?.lng, triage.primaryAuthority, triage.primaryPhone, nearestTopResult]);

  // Execute call redirection directly to the target phone number
  const executeCallRedirect = (phoneNumber: string, targetName: string) => {
    if (!phoneNumber) return;
    setIsRedirecting(true);
    setCallInitiated(true);
    setAutoRedirectEnabled(false);
    setActiveDialedNumber(phoneNumber);

    const cleanNumber = phoneNumber.replace(/[^0-9+]/g, "");
    try {
      window.location.href = `tel:${cleanNumber}`;
    } catch (e) {
      console.warn("Could not automatically invoke tel link:", e);
    }
  };

  // Countdown effect for auto-call redirection
  useEffect(() => {
    if (!autoRedirectEnabled || callInitiated) {
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
      return;
    }

    countdownTimerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownTimerRef.current);
          executeCallRedirect(activePhoneNumber, activeTargetName);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    };
  }, [autoRedirectEnabled, callInitiated, activePhoneNumber, activeTargetName]);

  const progressPercent = Math.max(
    0,
    Math.min(100, ((DEFAULT_REDIRECT_SECONDS - countdown) / DEFAULT_REDIRECT_SECONDS) * 100)
  );

  return (
    <div
      className="fixed inset-0 z-[9999] bg-slate-950/85 flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-fade-in"
      style={{ transform: "translateZ(0)" }}
    >
      <div
        className="bg-slate-900 border-2 border-red-600 rounded-3xl max-w-xl w-full p-4 sm:p-6 text-white shadow-2xl space-y-4 relative my-auto"
        id="emergency-triage-modal"
      >
        {/* Top Header */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-red-600 flex items-center justify-center text-white shadow-lg flex-shrink-0">
              <Radio className="w-6 h-6 animate-pulse" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-mono uppercase bg-red-600 text-white px-2 py-0.5 rounded-full font-black tracking-wider">
                  {triage.urgency} SOS ALERT
                </span>
                <span className="text-xs text-red-400 font-mono">
                  {new Date(alert.createdAt).toLocaleTimeString()}
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-black text-white tracking-tight mt-0.5 truncate">
                {alert.userName}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            {isSirenPlaying && (
              <button
                onClick={onSilenceSiren}
                className="p-2 text-amber-400 hover:text-amber-300 rounded-xl bg-slate-800 hover:bg-slate-750 transition cursor-pointer"
                title="Silence siren"
              >
                <VolumeX className="w-5 h-5" />
              </button>
            )}

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-xl bg-slate-800 hover:bg-slate-750 transition cursor-pointer"
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* LIVE LOCATION TELEMETRY & SOS DETAILS */}
        <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-3 space-y-2">
          <div className="flex items-center justify-between text-xs flex-wrap gap-2">
            <div className="flex items-center gap-1.5 text-amber-400 font-mono font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <span>LIVE GPS TRACKING ACTIVE</span>
            </div>
            <span className="text-[10px] font-mono bg-red-950 text-red-300 border border-red-800/80 px-2 py-0.5 rounded-md uppercase">
              {alert.type} Emergency
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] pt-1">
            <div className="bg-slate-900/80 border border-slate-800 p-2 rounded-xl">
              <span className="text-[9px] text-slate-400 uppercase font-mono block">Citizen Contact</span>
              <a
                href={`tel:${alert.userPhone}`}
                className="text-xs font-black text-emerald-400 hover:underline flex items-center gap-1 mt-0.5"
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>{alert.userPhone}</span>
              </a>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 p-2 rounded-xl">
              <span className="text-[9px] text-slate-400 uppercase font-mono block">Citizen Device</span>
              <span className="text-xs font-bold text-slate-200 block truncate mt-0.5">
                {deviceDisplayName}
              </span>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 p-2 rounded-xl">
              <span className="text-[9px] text-slate-400 uppercase font-mono block">GPS Coordinates</span>
              <span className="text-xs font-mono text-slate-300 flex items-center gap-1 mt-0.5">
                <MapPin className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                <span>{alert.location.lat.toFixed(4)}, {alert.location.lng.toFixed(4)}</span>
              </span>
            </div>
          </div>

          {alert.details && (
            <p className="text-xs text-slate-300 bg-slate-900/60 border border-slate-850 p-2 rounded-xl italic">
              "{alert.details}"
            </p>
          )}
        </div>

        {/* CALL TARGET SELECTION TABS: 1. NEAREST PROVIDER (Default) | 2. USER DEVICE | 3. NATIONAL HOTLINE */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-mono text-[11px] uppercase font-extrabold text-slate-300 flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-emerald-400" />
              Emergency Call Redirection Destination:
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
              Auto-dials on zero
            </span>
          </div>

          {/* 3-Way Target Mode Toggle */}
          <div className="grid grid-cols-3 gap-1.5 bg-slate-950 p-1 rounded-2xl border border-slate-800">
            {/* 1. Nearest Local Provider (Recommended) */}
            <button
              type="button"
              id="call-target-nearest-tab"
              onClick={() => {
                setCallTargetMode("NEAREST_PROVIDER");
                setCountdown(DEFAULT_REDIRECT_SECONDS);
                setAutoRedirectEnabled(true);
                setCallInitiated(false);
              }}
              className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-black transition cursor-pointer text-center ${
                callTargetMode === "NEAREST_PROVIDER"
                  ? "bg-red-600 text-white shadow-lg shadow-red-600/30"
                  : "text-slate-400 hover:text-white hover:bg-slate-900"
              }`}
            >
              <Building2 className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="truncate">Nearest Station</span>
            </button>

            {/* 2. User's Device */}
            <button
              type="button"
              id="call-target-user-device-tab"
              onClick={() => {
                setCallTargetMode("USER_DEVICE");
                setCountdown(DEFAULT_REDIRECT_SECONDS);
                setAutoRedirectEnabled(true);
                setCallInitiated(false);
              }}
              className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-black transition cursor-pointer text-center ${
                callTargetMode === "USER_DEVICE"
                  ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/30"
                  : "text-slate-400 hover:text-white hover:bg-slate-900"
              }`}
            >
              <Smartphone className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="truncate">User Device</span>
            </button>

            {/* 3. National Hotline */}
            <button
              type="button"
              id="call-target-hotline-tab"
              onClick={() => {
                setCallTargetMode("NATIONAL_HOTLINE");
                setCountdown(DEFAULT_REDIRECT_SECONDS);
                setAutoRedirectEnabled(true);
                setCallInitiated(false);
              }}
              className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-black transition cursor-pointer text-center ${
                callTargetMode === "NATIONAL_HOTLINE"
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                  : "text-slate-400 hover:text-white hover:bg-slate-900"
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="truncate">Hotline ({triage.primaryPhone})</span>
            </button>
          </div>
        </div>

        {/* ACTIVE CALL DESTINATION HERO CARD WITH AUTO-COUNTDOWN & PROXIMITY BADGE */}
        <div
          className={`border-2 rounded-2xl p-4 space-y-3 transition-colors ${
            callTargetMode === "NEAREST_PROVIDER"
              ? "bg-red-950/35 border-red-500/70"
              : callTargetMode === "USER_DEVICE"
              ? "bg-emerald-950/35 border-emerald-500/70"
              : "bg-indigo-950/35 border-indigo-500/70"
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1 min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={`text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded-md ${
                    callTargetMode === "NEAREST_PROVIDER"
                      ? "bg-red-900/80 text-red-200 border border-red-700"
                      : callTargetMode === "USER_DEVICE"
                      ? "bg-emerald-900/80 text-emerald-200 border border-emerald-700"
                      : "bg-indigo-900/80 text-indigo-200 border border-indigo-700"
                  }`}
                >
                  {callTargetMode === "NEAREST_PROVIDER"
                    ? "Nearest Local Emergency Station"
                    : callTargetMode === "USER_DEVICE"
                    ? "Distressed Citizen Device Target"
                    : "National Command Hotline"}
                </span>

                {callTargetMode === "NEAREST_PROVIDER" && nearestTopResult && (
                  <span className="text-[10px] font-mono font-bold bg-amber-950 text-amber-300 border border-amber-800 px-2 py-0.5 rounded-md flex items-center gap-1">
                    <Compass className="w-3 h-3 text-amber-400" />
                    <span>{nearestTopResult.distanceFormatted} away ({nearestTopResult.directionArrow} {nearestTopResult.directionLabel})</span>
                  </span>
                )}
              </div>

              <h4 className="text-base sm:text-lg font-black text-white truncate flex items-center gap-2">
                {callTargetMode === "NEAREST_PROVIDER" ? (
                  <>
                    <Building2 className="w-4 h-4 text-red-400 flex-shrink-0" />
                    <span className="truncate">{nearestTopResult?.provider.name || selectedAuthority.name}</span>
                  </>
                ) : callTargetMode === "USER_DEVICE" ? (
                  <>
                    <Smartphone className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    <span className="truncate">{alert.userName} ({deviceDisplayName})</span>
                  </>
                ) : (
                  <>
                    <ShieldAlert className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                    <span className="truncate">{triage.primaryAuthority}</span>
                  </>
                )}
              </h4>

              {callTargetMode === "NEAREST_PROVIDER" && nearestTopResult && (
                <div className="text-[11px] text-slate-300 flex items-center gap-2 flex-wrap">
                  <span className="text-slate-400 font-mono">📍 {nearestTopResult.provider.address}</span>
                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                    <Car className="w-3 h-3" />
                    <span>~{nearestTopResult.estimatedEtaMinutes} min response ETA</span>
                  </span>
                </div>
              )}
            </div>

            <div className="text-right flex-shrink-0">
              <span className="text-[10px] font-mono text-slate-400 block">Dial Number</span>
              <span
                className={`text-xl sm:text-2xl font-mono font-black ${
                  callTargetMode === "NEAREST_PROVIDER"
                    ? "text-red-400"
                    : callTargetMode === "USER_DEVICE"
                    ? "text-emerald-400"
                    : "text-indigo-400"
                }`}
              >
                {activePhoneNumber}
              </span>
            </div>
          </div>

          {/* Auto-Redirect Countdown Bar */}
          {autoRedirectEnabled && !callInitiated ? (
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-amber-300 font-bold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                  Auto-Calling {callTargetMode === "NEAREST_PROVIDER" ? "Nearest Provider" : callTargetMode === "USER_DEVICE" ? "User Device" : "Hotline"} in {countdown}s...
                </span>
                <button
                  type="button"
                  onClick={() => setAutoRedirectEnabled(false)}
                  className="text-[10px] text-slate-400 hover:text-white underline cursor-pointer"
                >
                  Pause Countdown
                </button>
              </div>

              <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                <div
                  className={`h-full transition-all duration-1000 ease-linear rounded-full ${
                    callTargetMode === "NEAREST_PROVIDER"
                      ? "bg-gradient-to-r from-amber-500 to-red-500"
                      : callTargetMode === "USER_DEVICE"
                      ? "bg-gradient-to-r from-emerald-500 to-teal-400"
                      : "bg-gradient-to-r from-indigo-500 to-purple-500"
                  }`}
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          ) : callInitiated ? (
            <div className="bg-emerald-950/70 border border-emerald-500/70 rounded-xl p-2 text-center text-xs text-emerald-300 font-bold flex items-center justify-center gap-2">
              <Phone className="w-4 h-4 animate-bounce text-emerald-400" />
              <span>Call Redirect Dispatched to {activeDialedNumber || activePhoneNumber}</span>
            </div>
          ) : (
            <div className="flex items-center justify-between text-[11px] text-slate-400 pt-0.5">
              <span>Auto-call countdown paused</span>
              <button
                type="button"
                onClick={() => {
                  setCountdown(DEFAULT_REDIRECT_SECONDS);
                  setAutoRedirectEnabled(true);
                }}
                className="text-amber-400 hover:underline flex items-center gap-1 font-bold cursor-pointer"
              >
                <Play className="w-3 h-3" />
                <span>Resume Auto-Call</span>
              </button>
            </div>
          )}
        </div>

        {/* ACCORDION: VIEW ALL NEARBY EMERGENCY SERVICE PROVIDERS */}
        <div className="space-y-1.5">
          <button
            type="button"
            onClick={() => setShowNearbyList(!showNearbyList)}
            className="w-full flex items-center justify-between p-2.5 bg-slate-950 hover:bg-slate-850 rounded-xl border border-slate-800 text-xs text-slate-300 font-bold transition cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-red-400" />
              <span>Nearby Emergency Service Providers to User GPS ({nearbyProvidersList.length} Found)</span>
            </div>
            <ChevronDown className={`w-4 h-4 transition-transform ${showNearbyList ? "rotate-180" : ""}`} />
          </button>

          {showNearbyList && (
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-2 space-y-2 max-h-56 overflow-y-auto">
              {nearbyProvidersList.map((item, idx) => (
                <div
                  key={item.provider.id}
                  className="bg-slate-900/90 border border-slate-800 p-2.5 rounded-xl flex items-center justify-between gap-2"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm">{item.provider.icon}</span>
                      <span className="text-xs font-black text-white truncate">{item.provider.name}</span>
                    </div>
                    <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5 font-mono">
                      <span className="text-amber-400 font-bold">{item.distanceFormatted} ({item.directionArrow} {item.directionLabel})</span>
                      <span>•</span>
                      <span className="truncate">{item.provider.address}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => executeCallRedirect(item.provider.phone, item.provider.name)}
                      className="px-2.5 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-mono font-black rounded-lg transition flex items-center gap-1 shadow-sm cursor-pointer"
                      title={`Call ${item.provider.name} directly`}
                    >
                      <Phone className="w-3 h-3" />
                      <span>{item.provider.phone}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* PRIMARY ACTION BUTTONS */}
        <div className="space-y-2 pt-1">
          {/* Main Action Buttons Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {/* Action 1: Call Nearest Local Emergency Provider */}
            <button
              id="call-nearest-provider-btn"
              type="button"
              onClick={() =>
                executeCallRedirect(
                  nearestTopResult?.provider.phone || selectedAuthority.number,
                  nearestTopResult?.provider.name || selectedAuthority.name
                )
              }
              className="flex items-center justify-center gap-2 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-black text-xs py-3 px-4 rounded-xl transition shadow-lg shadow-red-600/30 cursor-pointer"
            >
              <Building2 className="w-4 h-4" />
              <span className="truncate">
                Call Nearest Station ({nearestTopResult?.distanceFormatted || "Local"})
              </span>
            </button>

            {/* Action 2: Call Citizen's Device Directly */}
            <button
              id="call-user-device-now-btn"
              type="button"
              onClick={() => executeCallRedirect(alert.userPhone, alert.userName)}
              className="flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs py-3 px-4 rounded-xl transition shadow-lg shadow-emerald-600/30 cursor-pointer"
            >
              <Smartphone className="w-4 h-4" />
              <span className="truncate">Call User Device ({alert.userPhone})</span>
            </button>
          </div>

          {/* Secondary Actions: Map Track & Resolve */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                onCenterMap(alert);
                onClose();
              }}
              className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-indigo-950 text-indigo-300 hover:text-white font-extrabold text-xs py-2.5 px-4 rounded-xl transition border border-indigo-900/50 cursor-pointer"
            >
              <MapPin className="w-4 h-4" />
              <span>Track Live Location On Map</span>
            </button>

            <button
              type="button"
              onClick={() => onResolve(alert)}
              disabled={isLoading}
              className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-red-950 text-rose-300 hover:text-white font-extrabold text-xs py-2.5 px-4 rounded-xl transition border border-rose-900/50 disabled:opacity-50 cursor-pointer"
            >
              <CheckSquare className="w-4 h-4" />
              <span>{isLoading ? "Resolving SOS..." : "Resolve Incident"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmergencyNotificationModal;
