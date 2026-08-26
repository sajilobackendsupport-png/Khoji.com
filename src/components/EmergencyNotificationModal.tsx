import React, { useState, useEffect, useRef } from "react";
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
} from "lucide-react";
import { EmergencyAlert } from "../types";
import {
  identifyEmergencyAndTarget,
  NEPAL_DISPATCH_AUTHORITIES,
  EmergencyTriageResult,
} from "../utils/emergencyTriage";

interface EmergencyNotificationModalProps {
  alert: EmergencyAlert | null;
  onClose: () => void;
  onResolve: (alert: EmergencyAlert) => void;
  onCenterMap: (alert: EmergencyAlert) => void;
  onSilenceSiren: () => void;
  isSirenPlaying?: boolean;
  isLoading?: boolean;
}

const DEFAULT_REDIRECT_SECONDS = 5;

export const EmergencyNotificationModal: React.FC<EmergencyNotificationModalProps> = ({
  alert,
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

  // 2. State for target authority (supports one-tap admin override)
  const [selectedAuthority, setSelectedAuthority] = useState<{
    name: string;
    number: string;
    category: string;
    isCustom?: boolean;
  }>({
    name: triage.primaryAuthority,
    number: triage.primaryPhone,
    category: triage.categoryLabel,
  });

  const [showAuthorityDropdown, setShowAuthorityDropdown] = useState(false);
  const [autoRedirectEnabled, setAutoRedirectEnabled] = useState(true);
  const [countdown, setCountdown] = useState<number>(DEFAULT_REDIRECT_SECONDS);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [callInitiated, setCallInitiated] = useState(false);

  const countdownTimerRef = useRef<any>(null);

  // Re-sync when alert changes
  useEffect(() => {
    setSelectedAuthority({
      name: triage.primaryAuthority,
      number: triage.primaryPhone,
      category: triage.categoryLabel,
    });
    setCountdown(DEFAULT_REDIRECT_SECONDS);
    setAutoRedirectEnabled(true);
    setIsRedirecting(false);
    setCallInitiated(false);
  }, [alert.id, triage.primaryAuthority, triage.primaryPhone, triage.categoryLabel]);

  // Execute call redirection
  const executeCallRedirect = (phoneNumber: string, authorityName: string) => {
    setIsRedirecting(true);
    setCallInitiated(true);
    setAutoRedirectEnabled(false);

    // Trigger telephone link
    const cleanNumber = phoneNumber.replace(/[^0-9+]/g, "");
    try {
      window.location.href = `tel:${cleanNumber}`;
    } catch (e) {
      console.warn("Could not automatically invoke tel link:", e);
    }
  };

  // Countdown effect
  useEffect(() => {
    if (!autoRedirectEnabled || callInitiated) {
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
      return;
    }

    countdownTimerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownTimerRef.current);
          executeCallRedirect(selectedAuthority.number, selectedAuthority.name);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    };
  }, [autoRedirectEnabled, callInitiated, selectedAuthority.number, selectedAuthority.name]);

  const progressPercent = Math.max(0, Math.min(100, ((DEFAULT_REDIRECT_SECONDS - countdown) / DEFAULT_REDIRECT_SECONDS) * 100));

  return (
    <div
      id="emergency-notification-modal-overlay"
      className="fixed inset-0 z-[9999] bg-slate-950/80 flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-fade-in"
      style={{
        transform: "translateZ(0)", // Hardware-accelerated composition
      }}
    >
      <div
        id="emergency-modal-card"
        className="bg-slate-900 border border-red-500/80 rounded-3xl max-w-xl w-full text-white shadow-2xl space-y-4 p-5 sm:p-6 relative overflow-hidden ring-2 ring-red-500/40 my-auto"
      >
        {/* Top Header */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-red-600 flex items-center justify-center text-white shadow-lg flex-shrink-0">
              <Radio className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-mono uppercase bg-red-600 text-white px-2 py-0.5 rounded-full font-black tracking-wider">
                  {triage.urgency} SOS DETECTED
                </span>
                <span className="text-xs text-red-400 font-mono">
                  {new Date(alert.createdAt).toLocaleTimeString()}
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-black text-white tracking-tight mt-0.5 truncate max-w-xs sm:max-w-md">
                {alert.userName}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {isSirenPlaying && (
              <button
                onClick={onSilenceSiren}
                id="modal-silence-siren-btn"
                className="p-2 bg-slate-800 hover:bg-slate-700 text-amber-400 rounded-xl transition cursor-pointer border border-slate-700"
                title="Silence siren"
              >
                <VolumeX className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={onClose}
              id="modal-dismiss-btn"
              className="p-2 text-slate-400 hover:text-white rounded-xl bg-slate-800 hover:bg-slate-700 transition cursor-pointer border border-slate-700"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* AI EMERGENCY IDENTIFICATION & AUTO-CALL REDIRECTION PANEL */}
        <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3.5 shadow-inner">
          {/* Identified Emergency Type Badge */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-[11px] uppercase font-mono font-extrabold text-slate-300">
                  Auto-Identified Emergency:
                </span>
              </div>
              <div className="text-sm font-black text-red-400 flex items-center gap-1.5">
                <span>{triage.categoryLabel}</span>
              </div>
            </div>

            <span className="text-[10px] bg-slate-800 text-slate-300 border border-slate-700 px-2 py-0.5 rounded-lg font-mono">
              Auto-Routing Active
            </span>
          </div>

          {/* AI Reason & Recommended Action */}
          <div className="bg-slate-900/90 border border-slate-800/80 rounded-xl p-2.5 text-xs text-slate-300 space-y-1">
            <p className="text-[11px] text-slate-400">
              <strong className="text-slate-200">Detection Trigger:</strong> {triage.detectedReason}
            </p>
            <p className="text-[11px] text-emerald-400">
              <strong className="text-emerald-300">Protocol:</strong> {triage.recommendedAction}
            </p>
          </div>

          {/* AUTO-CALL REDIRECTION HERO BANNER */}
          <div className="bg-red-950/40 border-2 border-red-500/60 rounded-2xl p-3.5 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="space-y-0.5 min-w-0">
                <span className="text-[10px] font-mono uppercase text-red-300 font-bold block">
                  Target Response Authority
                </span>
                <h4 className="text-base font-black text-white truncate flex items-center gap-2">
                  <span>{selectedAuthority.name}</span>
                </h4>
              </div>

              <div className="text-right flex-shrink-0">
                <span className="text-[10px] font-mono text-slate-400 block">Dial Hotline</span>
                <span className="text-xl font-mono font-black text-emerald-400">
                  {selectedAuthority.number}
                </span>
              </div>
            </div>

            {/* Auto-Redirect Countdown Bar */}
            {autoRedirectEnabled && !callInitiated ? (
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-amber-300 font-bold flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                    Auto-Redirecting Call in {countdown}s...
                  </span>
                  <button
                    onClick={() => setAutoRedirectEnabled(false)}
                    className="text-[10px] text-slate-400 hover:text-white underline cursor-pointer"
                  >
                    Pause Countdown
                  </button>
                </div>

                <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-amber-500 to-red-500 h-full transition-all duration-1000 ease-linear rounded-full"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
            ) : callInitiated ? (
              <div className="bg-emerald-950/60 border border-emerald-500/60 rounded-xl p-2 text-center text-xs text-emerald-300 font-bold flex items-center justify-center gap-1.5">
                <Phone className="w-3.5 h-3.5 animate-bounce text-emerald-400" />
                <span>Call Redirect Dispatched to {selectedAuthority.number}</span>
              </div>
            ) : (
              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-0.5">
                <span>Auto-redirect paused</span>
                <button
                  onClick={() => {
                    setCountdown(DEFAULT_REDIRECT_SECONDS);
                    setAutoRedirectEnabled(true);
                  }}
                  className="text-amber-400 hover:underline flex items-center gap-1 font-bold cursor-pointer"
                >
                  <Play className="w-3 h-3" />
                  <span>Resume Countdown</span>
                </button>
              </div>
            )}

            {/* Quick Authority Switcher Dropdown */}
            <div className="relative pt-1">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setShowAuthorityDropdown(!showAuthorityDropdown)}
                  className="text-[11px] text-indigo-300 hover:text-indigo-200 flex items-center gap-1 font-bold cursor-pointer py-1"
                >
                  <span>Switch Emergency Authority / Dispatch Department</span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 transition-transform ${showAuthorityDropdown ? "rotate-180" : ""}`}
                  />
                </button>
              </div>

              {showAuthorityDropdown && (
                <div className="mt-2 bg-slate-900 border border-slate-700 rounded-xl p-2 grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-48 overflow-y-auto shadow-2xl z-20">
                  {NEPAL_DISPATCH_AUTHORITIES.map((auth) => (
                    <button
                      key={auth.id}
                      onClick={() => {
                        setSelectedAuthority({
                          name: auth.name,
                          number: auth.number,
                          category: auth.category,
                        });
                        setShowAuthorityDropdown(false);
                        setCountdown(DEFAULT_REDIRECT_SECONDS);
                        setAutoRedirectEnabled(true);
                      }}
                      className={`text-left p-2 rounded-lg text-xs transition border cursor-pointer ${
                        selectedAuthority.number === auth.number
                          ? "bg-red-600 text-white border-red-500 font-bold"
                          : "bg-slate-800 hover:bg-slate-750 text-slate-200 border-slate-700"
                      }`}
                    >
                      <div className="flex items-center gap-1 text-[11px] font-bold">
                        <span>{auth.icon}</span>
                        <span className="truncate">{auth.name}</span>
                      </div>
                      <div className="text-[10px] font-mono text-emerald-300 mt-0.5">
                        ☎ {auth.number}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* CITIZEN TELEMETRY & SOS DETAILS */}
        <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-3.5 space-y-2 text-xs">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-mono font-bold block">
                Citizen Phone
              </span>
              <a
                href={`tel:${alert.userPhone}`}
                className="text-sm font-mono font-bold text-emerald-400 hover:underline flex items-center gap-1 mt-0.5"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>{alert.userPhone}</span>
              </a>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-mono font-bold block">
                GPS Coordinates
              </span>
              <div className="text-[11px] font-mono text-slate-200 flex items-center gap-1 mt-0.5">
                <MapPin className="w-3.5 h-3.5 text-red-500" />
                <span>
                  {alert.location.lat.toFixed(4)}, {alert.location.lng.toFixed(4)}
                </span>
              </div>
            </div>
          </div>

          {alert.details && (
            <div className="border-t border-slate-800 pt-2 text-[11px] text-slate-300 bg-slate-900/50 p-2 rounded-xl italic">
              "{alert.details}"
            </div>
          )}
        </div>

        {/* PRIMARY ACTION BUTTONS */}
        <div className="space-y-2 pt-1">
          {/* Main Action: Instant Call to Identified Authority */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              id="call-authority-now-btn"
              onClick={() => executeCallRedirect(selectedAuthority.number, selectedAuthority.name)}
              className="flex items-center justify-center gap-2 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-black text-xs py-3 px-4 rounded-xl transition shadow-lg shadow-red-600/30 cursor-pointer"
            >
              <Phone className="w-4 h-4" />
              <span>
                Call {selectedAuthority.name} ({selectedAuthority.number}) Now
              </span>
            </button>

            <a
              id="call-citizen-btn"
              href={`tel:${alert.userPhone}`}
              className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs py-3 px-4 rounded-xl transition shadow-lg shadow-emerald-600/20 text-center cursor-pointer"
            >
              <Phone className="w-4 h-4" />
              <span>Call Citizen ({alert.userPhone})</span>
            </a>
          </div>

          {/* Secondary Actions: Map Track and Resolve */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              onClick={() => {
                onCenterMap(alert);
                onClose();
              }}
              className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-extrabold text-xs py-2.5 px-4 rounded-xl transition border border-slate-700 cursor-pointer"
            >
              <Navigation className="w-4 h-4 text-indigo-400" />
              <span>Focus On Live Map</span>
            </button>

            <button
              onClick={() => onResolve(alert)}
              disabled={isLoading}
              className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-red-950 text-rose-300 hover:text-white font-extrabold text-xs py-2.5 px-4 rounded-xl transition border border-rose-900/50 disabled:opacity-50 cursor-pointer"
            >
              <CheckSquare className="w-4 h-4" />
              <span>Resolve & Close SOS</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmergencyNotificationModal;
