import React, { useState, useEffect, useRef } from "react";
import { EmergencyAlert, UserProfile } from "../types";
import {
  Phone,
  PhoneCall,
  Shield,
  MapPin,
  AlertTriangle,
  Clock,
  Building2,
  Users,
  CheckCircle2,
  X,
  Radio,
  ExternalLink,
  MessageSquare,
  Navigation,
} from "lucide-react";
import {
  findNearestEmergencyProviders,
  NearestProviderResult,
} from "../utils/nearestEmergencyProviders";
import { identifyEmergencyAndTarget } from "../utils/emergencyTriage";

interface UserDeviceDialerModalProps {
  alert: EmergencyAlert;
  user: UserProfile;
  onClose: () => void;
  onResolve: (alert: EmergencyAlert) => void;
}

export default function UserDeviceDialerModal({
  alert,
  user,
  onClose,
  onResolve,
}: UserDeviceDialerModalProps) {
  // Find nearest emergency providers from user's current GPS
  const nearestProviders = React.useMemo(() => {
    const lat = alert.location?.lat || 27.7172;
    const lng = alert.location?.lng || 85.324;
    const catMap: Record<string, "police" | "medical" | "fire" | "all"> = {
      police: "police",
      ambulance: "medical",
      fire: "fire",
      lost: "police",
    };
    const cat = catMap[alert.type] || "all";
    return findNearestEmergencyProviders(lat, lng, cat, 4);
  }, [alert.location?.lat, alert.location?.lng, alert.type]);

  const nearestStation = nearestProviders[0] || null;
  const triage = identifyEmergencyAndTarget(alert);

  // Selected phone number to dial on user's device
  const defaultDialNumber = nearestStation
    ? nearestStation.provider.phone
    : triage.primaryPhone || alert.servicePhone || "100";

  const [selectedNumber, setSelectedNumber] = useState<string>(defaultDialNumber);
  const [selectedLabel, setSelectedLabel] = useState<string>(
    nearestStation
      ? `Nearest Station: ${nearestStation.provider.name} (${nearestStation.distanceFormatted})`
      : `Emergency Hotline: ${triage.primaryAuthority}`
  );

  // Auto-dial countdown
  const [countdown, setCountdown] = useState<number>(3);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [hasDialed, setHasDialed] = useState<boolean>(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-dial trigger function
  const triggerDeviceDial = (phoneToDial: string) => {
    setHasDialed(true);
    setIsPaused(true);
    // Sanitize phone number (keep digits, +, and dashes)
    const cleanNumber = phoneToDial.replace(/[^0-9+]/g, "");
    if (cleanNumber) {
      window.location.href = `tel:${cleanNumber}`;
    }
  };

  // Countdown timer effect
  useEffect(() => {
    if (isPaused || hasDialed) return;

    if (countdown > 0) {
      timerRef.current = setTimeout(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    } else if (countdown === 0 && !hasDialed) {
      // Auto-trigger dialing on user device
      triggerDeviceDial(selectedNumber);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [countdown, isPaused, hasDialed, selectedNumber]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-sm animate-in fade-in duration-200"
      id="user-device-dialer-modal"
    >
      <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-red-200 flex flex-col max-h-[92vh]">
        {/* Urgent Header Banner */}
        <div className="bg-gradient-to-r from-red-600 via-rose-600 to-red-700 text-white p-5 relative">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-white/20 border border-white/30 flex items-center justify-center text-white shadow-inner flex-shrink-0 animate-pulse">
                <PhoneCall className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-red-200 font-black flex items-center gap-1.5">
                  <Radio className="w-3.5 h-3.5 animate-ping" />
                  <span>Connecting from your device</span>
                </span>
                <h2 className="text-xl font-black tracking-tight leading-tight">
                  Emergency Call Redirection
                </h2>
                <p className="text-xs text-red-100 font-medium">
                  Service requested:{" "}
                  <span className="font-extrabold uppercase bg-white/20 px-1.5 py-0.5 rounded">
                    {alert.type} Emergency
                  </span>
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
              title="Close dialer popup (emergency remains active)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1 text-slate-800">
          {/* Automatic Dialing Countdown Status Banner */}
          {!hasDialed ? (
            <div
              className={`p-4 rounded-2xl border transition-all ${
                isPaused
                  ? "bg-slate-50 border-slate-200 text-slate-700"
                  : "bg-red-50 border-red-300 text-red-900 shadow-sm"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-11 h-11 rounded-2xl flex items-center justify-center font-mono font-black text-lg transition-transform ${
                      isPaused
                        ? "bg-slate-200 text-slate-700"
                        : "bg-red-600 text-white shadow-md scale-105 animate-pulse"
                    }`}
                  >
                    {isPaused ? "⏸" : countdown}
                  </div>
                  <div>
                    <h3 className="text-sm font-black">
                      {isPaused
                        ? "Auto-Dial Paused"
                        : `Auto-dialing on your device in ${countdown}s...`}
                    </h3>
                    <p className="text-xs text-slate-500 font-mono truncate max-w-[240px] sm:max-w-xs">
                      {selectedLabel}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setIsPaused(!isPaused)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-xl border transition cursor-pointer ${
                    isPaused
                      ? "bg-emerald-600 text-white border-emerald-700 hover:bg-emerald-700"
                      : "bg-white text-slate-700 border-slate-300 hover:bg-slate-100"
                  }`}
                >
                  {isPaused ? "Resume Timer" : "Pause"}
                </button>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-6 h-6 text-emerald-600 flex-shrink-0" />
                <div>
                  <h3 className="text-sm font-black">
                    Dialing triggered on your device
                  </h3>
                  <p className="text-xs text-emerald-700 font-mono">
                    Target: {selectedNumber} ({selectedLabel})
                  </p>
                </div>
              </div>
              <button
                onClick={() => triggerDeviceDial(selectedNumber)}
                className="px-3 py-1.5 bg-emerald-700 text-white text-xs font-bold rounded-xl hover:bg-emerald-800 transition cursor-pointer"
              >
                Redial
              </button>
            </div>
          )}

          {/* PRIMARY BIG ACTION BUTTON: DIAL RIGHT NOW ON USER DEVICE */}
          <button
            onClick={() => triggerDeviceDial(selectedNumber)}
            className="w-full py-4 px-6 bg-red-600 hover:bg-red-700 text-white font-black text-base sm:text-lg rounded-2xl transition shadow-lg flex items-center justify-center gap-3 cursor-pointer ring-4 ring-red-100 hover:scale-[1.01] active:scale-[0.99]"
            id="user-trigger-call-now-btn"
          >
            <Phone className="w-6 h-6 animate-bounce" />
            <span>Call Now: {selectedNumber}</span>
          </button>

          {/* Live GPS & Landmark detected */}
          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 space-y-1.5">
            <div className="flex items-center justify-between text-xs text-slate-500 font-mono font-bold">
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-red-600" />
                <span>Your Real Live Coordinates:</span>
              </span>
              <span className="text-slate-800">
                {alert.location.lat.toFixed(5)}, {alert.location.lng.toFixed(5)}
              </span>
            </div>
            {alert.address && (
              <p className="text-xs text-slate-700 font-medium bg-white p-2 rounded-xl border border-slate-200">
                📍 {alert.address}
              </p>
            )}
          </div>

          {/* Choice of Direct Emergency Numbers on User Device */}
          <div className="space-y-2">
            <label className="text-xs font-black text-slate-700 uppercase tracking-wider block">
              Choose Service Destination:
            </label>

            <div className="space-y-2">
              {/* Option 1: Nearest Local Emergency Station */}
              {nearestStation && (
                <div
                  onClick={() => {
                    setSelectedNumber(nearestStation.provider.phone);
                    setSelectedLabel(
                      `${nearestStation.provider.name} (${nearestStation.distanceFormatted})`
                    );
                    setCountdown(3);
                  }}
                  className={`p-3 rounded-2xl border-2 transition cursor-pointer flex items-center justify-between gap-2.5 ${
                    selectedNumber === nearestStation.provider.phone
                      ? "border-red-600 bg-red-50/70 text-red-950 shadow-sm"
                      : "border-slate-200 hover:border-slate-300 bg-white text-slate-800"
                  }`}
                >
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-mono font-black text-red-600 uppercase">
                        📍 Nearest Station ({nearestStation.distanceFormatted})
                      </span>
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.2 rounded">
                        ~{nearestStation.estimatedEtaMinutes}m ETA
                      </span>
                    </div>
                    <span className="text-xs font-extrabold block truncate">
                      {nearestStation.provider.name}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono block truncate">
                      {nearestStation.provider.address}
                    </span>
                  </div>

                  <a
                    href={`tel:${nearestStation.provider.phone.replace(/[^0-9+]/g, "")}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      triggerDeviceDial(nearestStation.provider.phone);
                    }}
                    className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white font-mono font-bold text-xs rounded-xl transition flex items-center gap-1 shadow-sm flex-shrink-0"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>{nearestStation.provider.phone}</span>
                  </a>
                </div>
              )}

              {/* Option 2: National Hotline */}
              <div
                onClick={() => {
                  setSelectedNumber(triage.primaryPhone);
                  setSelectedLabel(`National Hotline: ${triage.primaryAuthority}`);
                  setCountdown(3);
                }}
                className={`p-3 rounded-2xl border-2 transition cursor-pointer flex items-center justify-between gap-2.5 ${
                  selectedNumber === triage.primaryPhone
                    ? "border-red-600 bg-red-50/70 text-red-950 shadow-sm"
                    : "border-slate-200 hover:border-slate-300 bg-white text-slate-800"
                }`}
              >
                <div className="space-y-0.5 min-w-0">
                  <span className="text-xs font-mono font-black text-slate-500 uppercase block">
                    National Emergency Helpline
                  </span>
                  <span className="text-xs font-extrabold block truncate">
                    {triage.primaryAuthority}
                  </span>
                </div>

                <a
                  href={`tel:${triage.primaryPhone}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    triggerDeviceDial(triage.primaryPhone);
                  }}
                  className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white font-mono font-bold text-xs rounded-xl transition flex items-center gap-1 shadow-sm flex-shrink-0"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>{triage.primaryPhone}</span>
                </a>
              </div>

              {/* Option 3: Emergency Family Contact if available */}
              {user.emergencyContactPhone && (
                <div
                  onClick={() => {
                    setSelectedNumber(user.emergencyContactPhone!);
                    setSelectedLabel(`Family Contact: ${user.emergencyContactName || "Emergency Contact"}`);
                    setCountdown(3);
                  }}
                  className={`p-3 rounded-2xl border-2 transition cursor-pointer flex items-center justify-between gap-2.5 ${
                    selectedNumber === user.emergencyContactPhone
                      ? "border-red-600 bg-red-50/70 text-red-950 shadow-sm"
                      : "border-slate-200 hover:border-slate-300 bg-white text-slate-800"
                  }`}
                >
                  <div className="space-y-0.5 min-w-0">
                    <span className="text-xs font-mono font-black text-blue-600 uppercase block">
                      Saved Emergency Contact
                    </span>
                    <span className="text-xs font-extrabold block truncate">
                      {user.emergencyContactName || "Emergency Contact"} ({user.emergencyContactPhone})
                    </span>
                  </div>

                  <a
                    href={`tel:${user.emergencyContactPhone}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      triggerDeviceDial(user.emergencyContactPhone!);
                    }}
                    className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white font-mono font-bold text-xs rounded-xl transition flex items-center gap-1 shadow-sm flex-shrink-0"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>{user.emergencyContactPhone}</span>
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 border-t border-slate-200 px-5 py-3.5 flex items-center justify-between gap-3">
          <button
            onClick={() => onResolve(alert)}
            className="px-4 py-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 text-xs font-extrabold rounded-xl transition flex items-center gap-1.5 cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-700" />
            <span>I am Safe / Resolve SOS</span>
          </button>

          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-extrabold rounded-xl transition cursor-pointer"
          >
            Keep Alert Active
          </button>
        </div>
      </div>
    </div>
  );
}
