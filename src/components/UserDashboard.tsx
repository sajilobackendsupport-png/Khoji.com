import { useState, useEffect, useRef, useMemo } from "react";
import { UserProfile, EmergencyAlert, EmergencyType, UserStatus, SiteConfig } from "../types";
import { collection, doc, updateDoc, addDoc, query, where, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import { NEPAL_EMERGENCY_CONTACTS } from "../utils/nepalContacts";
import {
  subscribeSiteConfig,
  getSiteConfigLocal,
} from "../utils/siteConfig";
import {
  calculateBearing,
  getCompassDirection,
  estimateSpeedKmH,
  formatCoordinates,
} from "../utils/geoUtils";
import {
  getRealLocation,
  watchRealLocation,
  reverseGeocodeLocation,
  RealLocationResult,
} from "../utils/locationService";
import {
  Shield,
  Phone,
  MapPin,
  AlertOctagon,
  LogOut,
  CheckCircle2,
  Navigation,
  Radio,
  Compass,
  Activity,
  Play,
  Pause,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  ArrowDownRight,
  ArrowDownLeft,
  ArrowUpLeft,
  Users,
  RefreshCw,
  Crosshair,
  Sliders,
  LocateFixed,
  AlertTriangle,
  Megaphone,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Moon,
  Sun,
  Bookmark,
} from "lucide-react";
import TrackingMap from "./TrackingMap";
import { soundEngine } from "../utils/alertSound";
import FuzzySearchFilter from "./FuzzySearchFilter";
import { BookmarkButton } from "../hooks/useSavedItems";
import {
  findNearestEmergencyProviders,
  NearestProviderResult,
} from "../utils/nearestEmergencyProviders";
import { Building2 } from "lucide-react";
import useTheme from "../hooks/useTheme";

interface UserDashboardProps {
  user: UserProfile;
  onLogout: () => void;
  onOpenProfileModal?: () => void;
}

const getDeviceId = () => {
  let devId = localStorage.getItem("khoji_device_id");
  if (!devId) {
    devId = `dev-${Math.random().toString(36).substr(2, 9)}-${Date.now()}`;
    localStorage.setItem("khoji_device_id", devId);
  }
  return devId;
};

const getDeviceName = () => {
  let devName = localStorage.getItem("khoji_device_name");
  if (!devName) {
    const ua = navigator.userAgent;
    let browserName = "Web Browser";
    let platformName = "Device";

    if (ua.includes("Firefox")) browserName = "Firefox";
    else if (ua.includes("Chrome")) browserName = "Chrome";
    else if (ua.includes("Safari")) browserName = "Safari";
    else if (ua.includes("Edge")) browserName = "Edge";

    if (ua.includes("Android")) platformName = "Android";
    else if (ua.includes("iPhone") || ua.includes("iPad")) platformName = "iOS";
    else if (ua.includes("Mac")) platformName = "macOS";
    else if (ua.includes("Windows")) platformName = "Windows";
    else if (ua.includes("Linux")) platformName = "Linux";

    devName = `${browserName} on ${platformName}`;
    localStorage.setItem("khoji_device_name", devName);
  }
  return devName;
};

export default function UserDashboard({ user, onLogout, onOpenProfileModal }: UserDashboardProps) {
  const { isDark, toggleTheme } = useTheme();
  const [siteConfig, setSiteConfig] = useState<SiteConfig>(getSiteConfigLocal());
  const [showCrisisGuides, setShowCrisisGuides] = useState(false);
  const [status, setStatus] = useState<UserStatus>(user.status || "normal");
  const [location, setLocation] = useState<{
    lat: number;
    lng: number;
    accuracy: number;
    heading: number;
    speed: number;
    source: "gps-high" | "gps-low" | "ip" | "cached" | "manual";
    address?: string;
  }>({
    lat: user.lastLocation?.lat || 27.7172,
    lng: user.lastLocation?.lng || 85.324,
    accuracy: user.lastLocation?.accuracy || 25,
    heading: user.lastLocation?.heading || 0,
    speed: user.lastLocation?.speed || 0,
    source: "cached",
    address: undefined,
  });

  const [details, setDetails] = useState("");
  const [emergencies, setEmergencies] = useState<EmergencyAlert[]>([]);
  const [loading, setLoading] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [gpsLockActive, setGpsLockActive] = useState(true);
  const [message, setMessage] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);
  const [showSimControls, setShowSimControls] = useState(false);
  const [isAutoWalking, setIsAutoWalking] = useState(false);
  const autoWalkIntervalRef = useRef<any>(null);

  // Subscribe to real-time site configuration from Firebase
  useEffect(() => {
    const unsub = subscribeSiteConfig((cfg) => {
      setSiteConfig(cfg);
    });
    return unsub;
  }, []);

  // Initial Real GPS Acquisition & continuous watcher setup
  useEffect(() => {
    let unwatch: (() => void) | null = null;

    const initializeRealLocation = async () => {
      setIsLocating(true);
      try {
        const initialLoc = await getRealLocation();
        setLocation({
          lat: initialLoc.lat,
          lng: initialLoc.lng,
          accuracy: initialLoc.accuracy,
          heading: initialLoc.heading,
          speed: initialLoc.speed,
          source: initialLoc.source,
          address: initialLoc.address,
        });

        updateLocationInDb(
          initialLoc.lat,
          initialLoc.lng,
          initialLoc.heading,
          initialLoc.speed,
          initialLoc.accuracy
        );

        if (initialLoc.source === "gps-high") {
          setMessage({
            type: "success",
            text: `🛰️ Hardware GPS locked with high accuracy (±${initialLoc.accuracy}m). Real location tracking active.`,
          });
          setTimeout(() => setMessage(null), 5000);
        } else if (initialLoc.source === "gps-low") {
          setMessage({
            type: "info",
            text: `📡 Device location acquired (±${initialLoc.accuracy}m). Live tracking active.`,
          });
          setTimeout(() => setMessage(null), 5000);
        } else if (initialLoc.source === "ip") {
          setMessage({
            type: "info",
            text: `🌐 Network location estimated: ${initialLoc.address || "Nepal"}. Enable device GPS for centimeter accuracy.`,
          });
          setTimeout(() => setMessage(null), 6000);
        }
      } catch (err) {
        console.warn("Initial location fetch notice:", err);
      } finally {
        setIsLocating(false);
      }

      // Start continuous real-time watch
      unwatch = watchRealLocation(
        (realUpdate: RealLocationResult) => {
          if (!gpsLockActive) return; // if user manually dragged pin or test-walking, don't overwrite

          setLocation((prev) => ({
            lat: realUpdate.lat,
            lng: realUpdate.lng,
            accuracy: realUpdate.accuracy,
            heading: realUpdate.heading || calculateBearing(prev.lat, prev.lng, realUpdate.lat, realUpdate.lng),
            speed: realUpdate.speed || estimateSpeedKmH(prev.lat, prev.lng, Date.now() - 3000, realUpdate.lat, realUpdate.lng, Date.now()),
            source: realUpdate.source,
            address: realUpdate.address || prev.address,
          }));

          updateLocationInDb(
            realUpdate.lat,
            realUpdate.lng,
            realUpdate.heading,
            realUpdate.speed,
            realUpdate.accuracy
          );
        },
        (err) => {
          console.warn("Live watch error notice:", err);
        }
      );
    };

    initializeRealLocation();

    return () => {
      if (unwatch) unwatch();
      if (autoWalkIntervalRef.current) clearInterval(autoWalkIntervalRef.current);
    };
  }, [gpsLockActive]);

  // Manually force re-acquisition of Real GPS
  const handleForceAcquireLocation = async () => {
    setIsLocating(true);
    setGpsLockActive(true);
    if (isAutoWalking) {
      if (autoWalkIntervalRef.current) clearInterval(autoWalkIntervalRef.current);
      setIsAutoWalking(false);
    }

    try {
      const freshLoc = await getRealLocation();
      setLocation({
        lat: freshLoc.lat,
        lng: freshLoc.lng,
        accuracy: freshLoc.accuracy,
        heading: freshLoc.heading,
        speed: freshLoc.speed,
        source: freshLoc.source,
        address: freshLoc.address,
      });

      await updateLocationInDb(
        freshLoc.lat,
        freshLoc.lng,
        freshLoc.heading,
        freshLoc.speed,
        freshLoc.accuracy
      );

      setMessage({
        type: "success",
        text: `📍 Real location refreshed: ${freshLoc.address || `${freshLoc.lat.toFixed(4)}, ${freshLoc.lng.toFixed(4)}`} (${freshLoc.source.toUpperCase()})`,
      });
      setTimeout(() => setMessage(null), 4000);
    } catch (error: any) {
      setMessage({
        type: "error",
        text: "Could not access hardware GPS. Please ensure Location is allowed in browser settings.",
      });
    } finally {
      setIsLocating(false);
    }
  };

  // Fetch emergencies triggered by this user
  useEffect(() => {
    const q = query(collection(db, "emergencies"), where("userId", "==", user.uid));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: EmergencyAlert[] = [];
        snapshot.forEach((docSnap) => {
          list.push(docSnap.data() as EmergencyAlert);
        });
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setEmergencies(list);
        localStorage.setItem(`khoji_emergencies_${user.uid}`, JSON.stringify(list));
      },
      (error) => {
        console.warn("Emergencies stream notice:", error);
        const localList = localStorage.getItem(`khoji_emergencies_${user.uid}`);
        if (localList) {
          try {
            setEmergencies(JSON.parse(localList));
          } catch {}
        }
      }
    );

    return unsubscribe;
  }, [user.uid]);

  // Handle location and direction update in Firestore & local database
  const updateLocationInDb = async (
    lat: number,
    lng: number,
    heading: number = location.heading,
    speed: number = location.speed,
    accuracy: number = location.accuracy
  ) => {
    const dId = getDeviceId();
    const dName = getDeviceName();

    const locData = {
      lat,
      lng,
      heading,
      speed,
      accuracy,
      timestamp: new Date().toISOString(),
    };

    const localDeviceEntry = {
      deviceId: dId,
      deviceName: dName,
      lastLocation: locData,
      status: status,
      updatedAt: new Date().toISOString(),
    };

    const currentDevices = user.devices || {};
    const updatedUser: UserProfile = {
      ...user,
      lastLocation: locData,
      devices: {
        ...currentDevices,
        [dId]: localDeviceEntry,
      },
      updatedAt: new Date().toISOString(),
    };

    localStorage.setItem(`khoji_user_${user.uid}`, JSON.stringify(updatedUser));

    const currentGlobalUsers = localStorage.getItem("khoji_all_users");
    const globalUsersList: UserProfile[] = currentGlobalUsers ? JSON.parse(currentGlobalUsers) : [];
    const existingIndex = globalUsersList.findIndex((u) => u.uid === user.uid);
    if (existingIndex >= 0) {
      const existingDevices = globalUsersList[existingIndex].devices || {};
      globalUsersList[existingIndex] = {
        ...updatedUser,
        devices: {
          ...existingDevices,
          [dId]: localDeviceEntry,
        },
      };
    } else {
      globalUsersList.push(updatedUser);
    }
    localStorage.setItem("khoji_all_users", JSON.stringify(globalUsersList));

    try {
      const userDocRef = doc(db, "users", user.uid);
      await updateDoc(userDocRef, {
        lastLocation: locData,
        [`devices.${dId}`]: localDeviceEntry,
        updatedAt: new Date().toISOString(),
      });

      // Synchronize live moving coordinates to any active emergency alerts
      const activeEmergencies = emergencies.filter((e) => e.status === "active");
      if (activeEmergencies.length > 0) {
        const updatedEmergencies = emergencies.map((e) =>
          e.status === "active" ? { ...e, location: { lat, lng } } : e
        );
        setEmergencies(updatedEmergencies);
        localStorage.setItem(`khoji_emergencies_${user.uid}`, JSON.stringify(updatedEmergencies));

        // Update active emergencies in Firestore
        for (const activeEm of activeEmergencies) {
          try {
            const emDocRef = doc(db, "emergencies", activeEm.id);
            await updateDoc(emDocRef, {
              location: { lat, lng },
            });
          } catch (e) {
            // non-blocking
          }
        }
      }
    } catch (error) {
      console.warn("Firestore GPS update notice:", error);
    }
  };

  // Move step in a given direction (Simulation utility)
  const moveInDirection = (bearing: number, stepMeters: number = 40) => {
    setGpsLockActive(false); // user manually nudged location
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const rad = toRad(bearing);

    const deltaLat = (Math.cos(rad) * stepMeters) / 111000;
    const deltaLng = (Math.sin(rad) * stepMeters) / (111000 * Math.cos(toRad(location.lat)));

    const nextLat = location.lat + deltaLat;
    const nextLng = location.lng + deltaLng;
    const simulatedSpeed = 15;

    setLocation((prev) => ({
      ...prev,
      lat: nextLat,
      lng: nextLng,
      heading: bearing,
      speed: simulatedSpeed,
      source: "manual",
    }));

    updateLocationInDb(nextLat, nextLng, bearing, simulatedSpeed, 15);
  };

  // Toggle Continuous Auto-Walking Simulation
  const toggleAutoWalk = () => {
    if (isAutoWalking) {
      if (autoWalkIntervalRef.current) clearInterval(autoWalkIntervalRef.current);
      setIsAutoWalking(false);
      setLocation((prev) => ({ ...prev, speed: 0 }));
      updateLocationInDb(location.lat, location.lng, location.heading, 0);
      return;
    }

    setGpsLockActive(false);
    setIsAutoWalking(true);
    let stepIndex = 0;
    const bearings = [0, 45, 90, 135, 180, 225, 270, 315];

    autoWalkIntervalRef.current = setInterval(() => {
      stepIndex++;
      const bearing = bearings[stepIndex % bearings.length];
      const rad = (bearing * Math.PI) / 180;
      const stepMeters = 30;

      setLocation((prev) => {
        const deltaLat = (Math.cos(rad) * stepMeters) / 111000;
        const deltaLng = (Math.sin(rad) * stepMeters) / (111000 * Math.cos((prev.lat * Math.PI) / 180));
        const nextLat = prev.lat + deltaLat;
        const nextLng = prev.lng + deltaLng;
        const speed = 18;

        updateLocationInDb(nextLat, nextLng, bearing, speed, 12);

        return {
          ...prev,
          lat: nextLat,
          lng: nextLng,
          heading: bearing,
          speed,
          source: "manual",
        };
      });
    }, 2000);
  };

  // Change user overall status (normal, lost, emergency)
  const changeStatus = async (newStatus: UserStatus) => {
    setLoading(true);
    setStatus(newStatus);

    const dId = getDeviceId();
    const dName = getDeviceName();

    const localDeviceEntry = {
      deviceId: dId,
      deviceName: dName,
      lastLocation: {
        lat: location.lat,
        lng: location.lng,
        heading: location.heading,
        speed: location.speed,
        accuracy: location.accuracy,
        timestamp: new Date().toISOString(),
      },
      status: newStatus,
      updatedAt: new Date().toISOString(),
    };

    const currentDevices = user.devices || {};
    const updatedUser = {
      ...user,
      status: newStatus,
      devices: {
        ...currentDevices,
        [dId]: localDeviceEntry,
      },
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem(`khoji_user_${user.uid}`, JSON.stringify(updatedUser));

    const currentGlobalUsers = localStorage.getItem("khoji_all_users");
    const globalUsersList: UserProfile[] = currentGlobalUsers ? JSON.parse(currentGlobalUsers) : [];
    const existingIndex = globalUsersList.findIndex((u) => u.uid === user.uid);
    if (existingIndex >= 0) {
      const existingDevices = globalUsersList[existingIndex].devices || {};
      globalUsersList[existingIndex] = {
        ...updatedUser,
        devices: {
          ...existingDevices,
          [dId]: localDeviceEntry,
        },
      };
    } else {
      globalUsersList.push(updatedUser);
    }
    localStorage.setItem("khoji_all_users", JSON.stringify(globalUsersList));

    try {
      const userDocRef = doc(db, "users", user.uid);
      await updateDoc(userDocRef, {
        status: newStatus,
        [`devices.${dId}`]: localDeviceEntry,
        updatedAt: new Date().toISOString(),
      });
      setMessage({ type: "success", text: `Status updated to: ${newStatus.toUpperCase()}` });
      setTimeout(() => setMessage(null), 3500);
    } catch (error) {
      console.warn("Status sync notice:", error);
      setMessage({ type: "success", text: `Status active: ${newStatus.toUpperCase()}` });
      setTimeout(() => setMessage(null), 3500);
    } finally {
      setLoading(false);
    }
  };

  // Trigger emergency alert SOS in Firestore
  const triggerSOS = async (type: EmergencyType) => {
    setLoading(true);
    const dId = getDeviceId();
    const alertId = `emergency-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const newAlert: EmergencyAlert = {
      id: alertId,
      userId: user.uid,
      userName: user.fullName,
      userPhone: user.phone,
      type,
      status: "active" as const,
      location: {
        lat: location.lat,
        lng: location.lng,
      },
      details: details.trim() || `Urgent ${type} rescue requested in Nepal. Location: ${location.address || `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`}`,
      deviceId: dId,
      createdAt: new Date().toISOString(),
    };

    // Save locally
    const currentLocal = localStorage.getItem(`khoji_emergencies_${user.uid}`);
    const localList: EmergencyAlert[] = currentLocal ? JSON.parse(currentLocal) : [];
    const updatedLocalList = [newAlert, ...localList];
    localStorage.setItem(`khoji_emergencies_${user.uid}`, JSON.stringify(updatedLocalList));
    setEmergencies(updatedLocalList);

    const currentGlobal = localStorage.getItem("khoji_all_emergencies");
    const globalList: EmergencyAlert[] = currentGlobal ? JSON.parse(currentGlobal) : [];
    localStorage.setItem("khoji_all_emergencies", JSON.stringify([newAlert, ...globalList]));

    const targetStatus: UserStatus = type === "lost" ? "lost" : "emergency";
    setStatus(targetStatus);
    soundEngine.playEmergencySiren(4);

    try {
      await addDoc(collection(db, "emergencies"), newAlert);

      const userDocRef = doc(db, "users", user.uid);
      await updateDoc(userDocRef, {
        status: targetStatus,
        lastLocation: {
          lat: location.lat,
          lng: location.lng,
          heading: location.heading,
          speed: location.speed,
          accuracy: location.accuracy,
          timestamp: new Date().toISOString(),
        },
        updatedAt: new Date().toISOString(),
      });

      setDetails("");
      setMessage({
        type: "success",
        text: `🚨 Active ${type.toUpperCase()} SOS broadcasted! Dispatchers are tracking your coordinates live.`,
      });
    } catch (error) {
      console.warn("SOS dispatch notice:", error);
      setDetails("");
      setMessage({
        type: "success",
        text: `🚨 Active ${type.toUpperCase()} SOS registered locally.`,
      });
    } finally {
      setLoading(false);
    }
  };

  // Map click or pin drag handler
  const handleMapLocationChange = async (lat: number, lng: number) => {
    setGpsLockActive(false); // User intentionally chose custom pin
    const bearing = calculateBearing(location.lat, location.lng, lat, lng);
    const revAddress = await reverseGeocodeLocation(lat, lng);

    setLocation({
      lat,
      lng,
      accuracy: 15,
      heading: bearing,
      speed: 10,
      source: "manual",
      address: revAddress,
    });

    updateLocationInDb(lat, lng, bearing, 10, 15);
  };

  const compassData = getCompassDirection(location.heading);

  // Live Nearest Emergency Service Providers based on real GPS
  const nearestProviders = useMemo(() => {
    return findNearestEmergencyProviders(location.lat, location.lng, "all", 3);
  }, [location.lat, location.lng]);

  return (
    <div className="w-full min-h-screen bg-slate-50 flex flex-col font-sans" id="user-dashboard-wrapper">
      {/* Alert bar when in emergency */}
      {status === "emergency" && (
        <div className="bg-red-600 text-white font-semibold text-center text-sm py-2.5 animate-pulse flex items-center justify-center gap-2 z-50 shadow-md">
          <Radio className="w-4 h-4 animate-ping" />
          <span>ACTIVE EMERGENCY BROADCAST: Dispatch Center is tracking your real coordinates and heading in real time.</span>
        </div>
      )}

      {/* Emergency Broadcast Banner from Firebase */}
      {siteConfig.bannerEnabled && siteConfig.bannerText && (
        <div
          className={`py-2.5 px-4 text-xs font-bold flex items-center justify-between gap-3 shadow-inner ${
            siteConfig.bannerSeverity === "critical"
              ? "bg-red-600 text-white animate-pulse"
              : siteConfig.bannerSeverity === "warning"
              ? "bg-amber-500 text-slate-950"
              : "bg-blue-600 text-white"
          }`}
        >
          <div className="flex items-center gap-2 max-w-7xl mx-auto flex-1 justify-center text-center">
            <Megaphone className="w-4 h-4 flex-shrink-0" />
            <span>{siteConfig.bannerText}</span>
          </div>
          <span className="text-[9px] uppercase font-mono px-2 py-0.5 rounded bg-black/20 text-white">
            Broadcast
          </span>
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-100 px-4 sm:px-6 py-3.5 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center text-white shadow-md">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-1.5">
              <span>{siteConfig.brandLogoText || "Khoji.com"}</span>
              <span className="text-[10px] bg-red-100 text-red-700 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                {siteConfig.badgeText || "Live Radar"}
              </span>
            </h1>
            <p className="text-[10px] text-slate-400 font-mono">
              {siteConfig.siteTagline || "NEPAL CITIZEN RESCUE GRID • ACTIVE"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            id="user-theme-toggle-btn"
            className="p-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition cursor-pointer border border-slate-200 dark:border-slate-700"
            title={`Switch to ${isDark ? "Light" : "Dark"} mode`}
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
          </button>

          {onOpenProfileModal && (
            <button
              onClick={onOpenProfileModal}
              className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition rounded-xl shadow-sm cursor-pointer"
              title="Switch profile, add family account, or manage saved profiles"
            >
              <Users className="w-3.5 h-3.5 text-blue-600" />
              <span className="hidden sm:inline">Switch Profile</span>
              <span className="text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded-full font-mono">
                {user.fullName.split(" ")[0]}
              </span>
            </button>
          )}

          <div className="text-right hidden md:block">
            <span className="text-sm font-semibold text-slate-800 block leading-tight">{user.fullName}</span>
            <p className="text-[11px] text-slate-500 font-mono">{user.phone}</p>
          </div>

          <button
            onClick={onLogout}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition rounded-xl border border-transparent cursor-pointer"
            title="Log out of current profile"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>

      {/* Main Grid */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side: SOS Controls & Status */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          {/* Status Display badge */}
          <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Device Tracking Status</span>
              <div className="flex items-center gap-2">
                <span
                  className={`w-3.5 h-3.5 rounded-full ${
                    status === "emergency"
                      ? "bg-red-500 animate-ping"
                      : status === "lost"
                      ? "bg-amber-500 animate-pulse"
                      : "bg-emerald-500"
                  }`}
                />
                <span className="font-black text-lg text-slate-800 uppercase tracking-tight">
                  Status: {status}
                </span>
              </div>
              <p className="text-xs text-slate-500 leading-normal">
                {status === "emergency" && "Dispatch agencies are tracking your live coordinates and heading."}
                {status === "lost" && "Broadcasting active lost device position to Admin locator panel."}
                {status === "normal" && "Device protected. System monitoring coordinates safely."}
              </p>
            </div>

            {/* Quick status resetting buttons */}
            <div className="flex flex-col gap-2">
              {status !== "normal" && (
                <button
                  onClick={() => changeStatus("normal")}
                  disabled={loading}
                  className="px-3 py-1.5 bg-emerald-100 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-lg hover:bg-emerald-200 transition disabled:opacity-50 flex items-center gap-1 cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Mark Safe</span>
                </button>
              )}
              {status !== "lost" && status !== "emergency" && (
                <button
                  onClick={() => changeStatus("lost")}
                  disabled={loading}
                  className="px-3 py-1.5 bg-amber-100 border border-amber-200 text-amber-800 text-xs font-bold rounded-lg hover:bg-amber-200 transition disabled:opacity-50 cursor-pointer"
                >
                  ⚠️ Lost Device
                </button>
              )}
            </div>
          </div>

          {/* Feedback messages */}
          {message && (
            <div
              className={`p-4 rounded-xl text-xs font-bold border ${
                message.type === "success"
                  ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                  : message.type === "info"
                  ? "bg-blue-50 text-blue-800 border-blue-200"
                  : "bg-red-50 text-red-800 border-red-200"
              }`}
            >
              {message.text}
            </div>
          )}

          {/* SOS Buttons */}
          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm space-y-4">
            <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <AlertOctagon className="text-red-500 w-5 h-5" />
              <span>Nepal Rapid Emergency Dispatch (SOS)</span>
            </h2>

            <p className="text-xs text-slate-500 leading-relaxed">
              Facing immediate danger? Push any red rescue button. The agency receives your real GPS coordinates & heading.
            </p>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-500 block">Incident Comments (Optional)</label>
              <textarea
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="Describe: e.g. Left phone in taxi #3122 near Thamel, or Medical help required near Patan..."
                className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:border-red-500 focus:outline-none min-h-[64px] bg-slate-50 transition"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <button
                onClick={() => triggerSOS("police")}
                disabled={loading}
                className="bg-red-600 hover:bg-red-700 text-white p-3 rounded-xl flex items-center gap-2.5 transition shadow-md font-bold text-center justify-center text-xs cursor-pointer"
              >
                🚨 Police Dispatch (100)
              </button>

              <button
                onClick={() => triggerSOS("ambulance")}
                disabled={loading}
                className="bg-rose-600 hover:bg-rose-700 text-white p-3 rounded-xl flex items-center gap-2.5 transition shadow-md font-bold text-center justify-center text-xs cursor-pointer"
              >
                🚑 Urgent Ambulance (102)
              </button>

              <button
                onClick={() => triggerSOS("fire")}
                disabled={loading}
                className="bg-orange-600 hover:bg-orange-700 text-white p-3 rounded-xl flex items-center gap-2.5 transition shadow-md font-bold text-center justify-center text-xs cursor-pointer"
              >
                🔥 Fire Brigade (101)
              </button>

              <button
                onClick={() => triggerSOS("lost")}
                disabled={loading}
                className="bg-slate-800 hover:bg-slate-900 text-white p-3 rounded-xl flex items-center gap-2.5 transition shadow-md font-bold text-center justify-center text-xs cursor-pointer"
              >
                ⚠️ Device Stolen Map Alert
              </button>
            </div>
          </div>

          {/* NEAREST EMERGENCY SERVICE PROVIDERS TO CITIZEN GPS */}
          <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b pb-2">
              <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-red-600" />
                <span>Nearest Emergency Stations (Live GPS)</span>
              </h2>
              <span className="text-[10px] bg-red-50 text-red-700 font-mono font-bold px-2 py-0.5 rounded-full border border-red-100">
                GPS Proximity
              </span>
            </div>

            <p className="text-xs text-slate-500">
              Closest emergency response stations calculated directly from your device's live coordinates:
            </p>

            <div className="space-y-2">
              {nearestProviders.map((item) => (
                <div
                  key={item.provider.id}
                  className="p-3 bg-slate-50 hover:bg-slate-100/80 border border-slate-200/80 rounded-xl transition flex items-center justify-between gap-2.5"
                >
                  <div className="space-y-0.5 min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-sm">{item.provider.icon}</span>
                      <span className="text-xs font-black text-slate-900 truncate">{item.provider.name}</span>
                    </div>
                    <div className="text-[11px] text-slate-500 flex items-center gap-2 font-mono flex-wrap">
                      <span className="text-red-600 font-bold">
                        📍 {item.distanceFormatted} ({item.directionArrow} {item.directionLabel})
                      </span>
                      <span>•</span>
                      <span className="text-emerald-700 font-semibold">~{item.estimatedEtaMinutes}m response ETA</span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono block truncate">
                      {item.provider.address}
                    </span>
                  </div>

                  <a
                    href={`tel:${item.provider.phone}`}
                    className="flex items-center gap-1 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white font-mono font-black text-xs rounded-xl transition shadow-sm flex-shrink-0 cursor-pointer"
                    title={`Call ${item.provider.name} immediately`}
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>{item.provider.phone}</span>
                  </a>
                </div>
              ))}
            </div>
          </div>

          {/* Hotline contacts dynamically synchronized via Firebase Web Customizer with Fuzzy Search & Filters */}
          <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <Phone className="w-4 h-4 text-slate-700" />
                <span>Nepalese Hotline Directory</span>
              </h2>
              <span className="text-[10px] text-slate-400 font-mono">
                {siteConfig.contacts?.length || NEPAL_EMERGENCY_CONTACTS.length} verified
              </span>
            </div>

            <FuzzySearchFilter
              items={siteConfig.contacts && siteConfig.contacts.length > 0 ? siteConfig.contacts : NEPAL_EMERGENCY_CONTACTS}
              searchKeys={["name", "description", "location", "category", "number"]}
              placeholder="Fuzzy search hotlines (e.g. 'polce', 'amblance', 'ktm')..."
              categoryKey="category"
              titleKey="name"
              debounceMs={250}
              fuzzyThreshold={0.35}
              showCategoryPills={true}
              renderItem={(contact, idx, meta) => (
                <div
                  key={contact.id || idx}
                  className="p-3 bg-slate-50/70 hover:bg-slate-50 border border-slate-200/80 rounded-xl transition flex items-start justify-between gap-2.5"
                >
                  <div className="space-y-0.5 min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-bold text-slate-900">{contact.name}</span>
                      {contact.category && (
                        <span className="text-[8px] uppercase font-bold px-1.5 py-0.5 rounded bg-slate-200 text-slate-700">
                          {contact.category}
                        </span>
                      )}
                      {meta.isFuzzyMatch && meta.searchScore !== undefined && (
                        <span className="text-[8px] font-mono font-semibold px-1 py-0.2 rounded bg-blue-100 text-blue-700">
                          match {(100 - (meta.searchScore * 100)).toFixed(0)}%
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 leading-normal">{contact.description}</p>
                    <span className="text-[9px] bg-white text-slate-600 font-medium px-1.5 py-0.5 rounded border border-slate-200 inline-block">
                      📍 {contact.location}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <BookmarkButton
                      item={{
                        id: `hotline-${contact.number}-${contact.name}`,
                        title: contact.name,
                        category: contact.category,
                        description: contact.description,
                      }}
                      userId={user.uid}
                      size="sm"
                    />
                    <a
                      href={`tel:${contact.number}`}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-100 font-extrabold text-xs rounded-xl transition cursor-pointer"
                    >
                      <Phone className="w-3 h-3" />
                      <span>{contact.number}</span>
                    </a>
                  </div>
                </div>
              )}
            />
          </div>

          {/* Crisis Guides and Safety Protocols from Firebase Customizer */}
          {siteConfig.crisisGuides && siteConfig.crisisGuides.length > 0 && (
            <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm space-y-3">
              <button
                onClick={() => setShowCrisisGuides(!showCrisisGuides)}
                className="w-full flex items-center justify-between text-left cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-indigo-600" />
                  <span className="text-xs font-extrabold text-slate-900">
                    Nepal Crisis Safety Guides ({siteConfig.crisisGuides.length})
                  </span>
                </div>
                {showCrisisGuides ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
              </button>

              {showCrisisGuides && (
                <div className="space-y-3 pt-2 divide-y divide-slate-100">
                  {siteConfig.crisisGuides.map((guide) => (
                    <div key={guide.id} className="pt-2 text-xs space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-base">{guide.icon || "🛡️"}</span>
                        <h4 className="font-bold text-slate-800">{guide.title}</h4>
                      </div>
                      <p className="text-[11px] text-slate-600 whitespace-pre-line bg-slate-50 p-2.5 rounded-xl border border-slate-150">
                        {guide.content}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Side: Map location & Real-Time GPS Tracking Controls */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex-1 flex flex-col gap-4 min-h-[460px]">
            {/* Real Location Header & Re-Acquire button */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-1.5">
                  <MapPin className="text-blue-600 w-5 h-5 animate-bounce" />
                  <span>Real Device Location Tracker</span>
                </h2>
                <p className="text-xs text-slate-500">
                  {location.address ? (
                    <span className="font-semibold text-slate-700">📍 {location.address}</span>
                  ) : (
                    "Acquiring real-time physical GPS coordinates..."
                  )}
                </p>
              </div>

              <div className="flex items-center gap-2">
                {/* Source Badge */}
                <span
                  className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase font-mono border flex items-center gap-1 ${
                    location.source === "gps-high"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : location.source === "gps-low"
                      ? "bg-blue-50 text-blue-700 border-blue-200"
                      : location.source === "ip"
                      ? "bg-amber-50 text-amber-700 border-amber-200"
                      : "bg-slate-100 text-slate-700 border-slate-200"
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-current animate-ping"></span>
                  {location.source === "gps-high"
                    ? "🛰️ GPS Hardware Lock"
                    : location.source === "gps-low"
                    ? "📡 Network GPS"
                    : location.source === "ip"
                    ? "🌐 IP Geolocation"
                    : "📍 Pinned"}
                </span>

                {/* Force Acquire Real Location */}
                <button
                  onClick={handleForceAcquireLocation}
                  disabled={isLocating}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm transition disabled:opacity-50 cursor-pointer"
                  title="Force re-acquire exact real physical device location from GPS sensor"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLocating ? "animate-spin" : ""}`} />
                  <span>{isLocating ? "Acquiring..." : "Locate Me"}</span>
                </button>
              </div>
            </div>

            {/* Coordinates & Compass Direction HUD */}
            <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 text-white grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="flex items-center gap-2">
                <div
                  className="w-9 h-9 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-center flex-shrink-0 transition-transform duration-500"
                  style={{ transform: `rotate(${location.heading}deg)` }}
                >
                  <Compass className="w-5 h-5 text-indigo-400" />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-mono block uppercase">Bearing</span>
                  <span className="font-mono text-xs font-bold text-slate-100">
                    {location.heading}° {compassData.code} {compassData.arrow}
                  </span>
                </div>
              </div>

              <div>
                <span className="text-[10px] text-slate-400 font-mono block uppercase">Ground Speed</span>
                <span className="font-mono text-xs font-bold text-emerald-400">
                  {location.speed > 0 ? `${location.speed} km/h` : "Stationary"}
                </span>
              </div>

              <div>
                <span className="text-[10px] text-slate-400 font-mono block uppercase">Latitude</span>
                <span className="font-mono text-xs font-bold text-slate-200">{location.lat.toFixed(5)}</span>
              </div>

              <div>
                <span className="text-[10px] text-slate-400 font-mono block uppercase">Longitude</span>
                <span className="font-mono text-xs font-bold text-slate-200">{location.lng.toFixed(5)}</span>
              </div>
            </div>

            {/* Live GPS Lock Bar & Testing Toolkit toggle */}
            <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs">
              <div className="flex items-center gap-2">
                <LocateFixed className="w-4 h-4 text-blue-600" />
                <span className="font-bold text-slate-700">Live GPS Auto-Tracking:</span>
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${
                    gpsLockActive ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                  }`}
                >
                  {gpsLockActive ? "LOCKED TO SENSOR" : "MANUAL MODE"}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {!gpsLockActive && (
                  <button
                    onClick={() => {
                      setGpsLockActive(true);
                      handleForceAcquireLocation();
                    }}
                    className="text-[11px] font-bold text-blue-600 hover:text-blue-800 underline cursor-pointer"
                  >
                    Resume GPS Sensor Lock
                  </button>
                )}

                <button
                  onClick={() => setShowSimControls(!showSimControls)}
                  className="flex items-center gap-1 text-[11px] font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-2 py-1 rounded-lg shadow-xs cursor-pointer"
                >
                  <Sliders className="w-3 h-3" />
                  <span>{showSimControls ? "Hide Testing Controls" : "Testing Controls"}</span>
                </button>
              </div>
            </div>

            {/* Optional Testing Simulator Pad (Collapsible) */}
            {showSimControls && (
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 animate-fadeIn">
                <div className="flex items-center gap-2">
                  <Navigation className="w-4 h-4 text-indigo-600" />
                  <div>
                    <div className="text-xs font-extrabold text-slate-800">Heading & Movement Test Pad</div>
                    <div className="text-[10px] text-slate-500">Tap arrows to simulate physical walking steps</div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* 8-Direction Step Controls */}
                  <div className="grid grid-cols-3 gap-1 bg-white p-1.5 rounded-xl border border-slate-200 shadow-sm">
                    <button
                      onClick={() => moveInDirection(315)}
                      className="p-1.5 hover:bg-indigo-50 text-slate-700 hover:text-indigo-600 rounded-lg transition text-xs flex items-center justify-center font-bold cursor-pointer"
                      title="North-West (315°)"
                    >
                      <ArrowUpLeft className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => moveInDirection(0)}
                      className="p-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg transition text-xs flex items-center justify-center font-bold cursor-pointer"
                      title="North (0°)"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => moveInDirection(45)}
                      className="p-1.5 hover:bg-indigo-50 text-slate-700 hover:text-indigo-600 rounded-lg transition text-xs flex items-center justify-center font-bold cursor-pointer"
                      title="North-East (45°)"
                    >
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => moveInDirection(270)}
                      className="p-1.5 hover:bg-indigo-50 text-slate-700 hover:text-indigo-600 rounded-lg transition text-xs flex items-center justify-center font-bold cursor-pointer"
                      title="West (270°)"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={toggleAutoWalk}
                      className={`p-1.5 rounded-lg text-xs font-extrabold flex items-center justify-center transition cursor-pointer ${
                        isAutoWalking ? "bg-amber-600 text-white animate-pulse" : "bg-slate-900 text-white hover:bg-slate-800"
                      }`}
                      title={isAutoWalking ? "Stop Walking" : "Auto-Walk Mode"}
                    >
                      {isAutoWalking ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      onClick={() => moveInDirection(90)}
                      className="p-1.5 hover:bg-indigo-50 text-slate-700 hover:text-indigo-600 rounded-lg transition text-xs flex items-center justify-center font-bold cursor-pointer"
                      title="East (90°)"
                    >
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => moveInDirection(225)}
                      className="p-1.5 hover:bg-indigo-50 text-slate-700 hover:text-indigo-600 rounded-lg transition text-xs flex items-center justify-center font-bold cursor-pointer"
                      title="South-West (225°)"
                    >
                      <ArrowDownLeft className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => moveInDirection(180)}
                      className="p-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg transition text-xs flex items-center justify-center font-bold cursor-pointer"
                      title="South (180°)"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => moveInDirection(135)}
                      className="p-1.5 hover:bg-indigo-50 text-slate-700 hover:text-indigo-600 rounded-lg transition text-xs flex items-center justify-center font-bold cursor-pointer"
                      title="South-East (135°)"
                    >
                      <ArrowDownRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <button
                    onClick={toggleAutoWalk}
                    className={`px-3 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition shadow cursor-pointer ${
                      isAutoWalking
                        ? "bg-amber-600 text-white border border-amber-500 shadow-amber-500/20"
                        : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/20"
                    }`}
                  >
                    {isAutoWalking ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                    <span>{isAutoWalking ? "Stop Walking" : "Auto-Walk Mode"}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Interactive Leaflet Tracking Map */}
            <div className="flex-1 min-h-[340px]">
              <TrackingMap
                simulateLocation={location}
                currentHeading={location.heading}
                currentSpeed={location.speed}
                accuracy={location.accuracy}
                locationSource={location.source}
                address={location.address}
                interactive={true}
                onMapClick={handleMapLocationChange}
              />
            </div>
          </div>

          {/* Historical emergencies */}
          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
            <h3 className="text-sm font-extrabold text-slate-900 mb-3 block">Your Recent Emergency Incidents</h3>

            {emergencies.length === 0 ? (
              <div className="text-center py-6 text-xs text-slate-400 border border-dashed rounded-xl bg-slate-50/50">
                No emergency incidents reported.
              </div>
            ) : (
              <div className="space-y-3.5 max-h-[160px] overflow-y-auto">
                {emergencies.map((alert) => (
                  <div
                    key={alert.id}
                    className="flex items-center justify-between border-b pb-3 last:border-0 last:pb-0"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-extrabold text-slate-800">Alert #{alert.id.split("-")[2]}</span>
                        <span
                          className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full ${
                            alert.status === "active"
                              ? "bg-rose-100 text-rose-800 border-rose-200"
                              : "bg-emerald-100 text-emerald-800 border-emerald-200"
                          } border`}
                        >
                          {alert.status}
                        </span>
                        <span className="text-[10px] text-slate-500 px-1 bg-slate-100 rounded">
                          {alert.type.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 italic">"{alert.details}"</p>
                      <span className="text-[9px] text-slate-400 font-mono block">
                        Created: {new Date(alert.createdAt).toLocaleString()}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 block font-mono">Location coordinates</span>
                      <span className="text-[11px] font-semibold text-slate-700 font-mono">
                        {alert.location.lat.toFixed(4)}, {alert.location.lng.toFixed(4)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
