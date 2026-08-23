import { useState, useEffect, useRef } from "react";
import { UserProfile, EmergencyAlert, EmergencyType, UserStatus } from "../types";
import { collection, doc, updateDoc, addDoc, query, where, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import { NEPAL_EMERGENCY_CONTACTS } from "../utils/nepalContacts";
import {
  calculateBearing,
  getCompassDirection,
  estimateSpeedKmH,
  formatCoordinates,
} from "../utils/geoUtils";
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
} from "lucide-react";
import TrackingMap from "./TrackingMap";

interface UserDashboardProps {
  user: UserProfile;
  onLogout: () => void;
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

export default function UserDashboard({ user, onLogout }: UserDashboardProps) {
  const [status, setStatus] = useState<UserStatus>(user.status || "normal");
  const [simLocation, setSimLocation] = useState({
    lat: user.lastLocation?.lat || 27.7172,
    lng: user.lastLocation?.lng || 85.324,
  });
  const [currentHeading, setCurrentHeading] = useState<number>(user.lastLocation?.heading || 0);
  const [currentSpeed, setCurrentSpeed] = useState<number>(user.lastLocation?.speed || 0);
  const [details, setDetails] = useState("");
  const [emergencies, setEmergencies] = useState<EmergencyAlert[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isAutoWalking, setIsAutoWalking] = useState(false);
  const autoWalkIntervalRef = useRef<any>(null);

  // Synchronize dynamic position with browser geolocation watchPosition
  useEffect(() => {
    let watchId: number | null = null;
    if (navigator.geolocation) {
      // First quick fix
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          const heading = pos.coords.heading !== null && !isNaN(pos.coords.heading) ? Math.round(pos.coords.heading) : 0;
          const speed = pos.coords.speed !== null && !isNaN(pos.coords.speed) ? Math.round(pos.coords.speed * 3.6) : 0;
          setSimLocation({ lat, lng });
          setCurrentHeading(heading);
          setCurrentSpeed(speed);
          updateLocationInDb(lat, lng, heading, speed, pos.coords.accuracy || 25);
        },
        (err) => {
          console.log("Initial geolocation notice:", err);
        },
        { enableHighAccuracy: true }
      );

      // Continuous live watcher for real device movements & direction turns
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          let heading = pos.coords.heading !== null && !isNaN(pos.coords.heading) ? Math.round(pos.coords.heading) : undefined;
          let speed = pos.coords.speed !== null && !isNaN(pos.coords.speed) ? Math.round(pos.coords.speed * 3.6) : undefined;

          // If device sensor did not provide heading, compute bearing from previous coordinate
          if (heading === undefined) {
            heading = calculateBearing(simLocation.lat, simLocation.lng, lat, lng);
          }
          if (speed === undefined) {
            speed = estimateSpeedKmH(
              simLocation.lat,
              simLocation.lng,
              Date.now() - 3000,
              lat,
              lng,
              Date.now()
            );
          }

          setSimLocation({ lat, lng });
          setCurrentHeading(heading);
          setCurrentSpeed(speed);
          updateLocationInDb(lat, lng, heading, speed, pos.coords.accuracy || 20);
        },
        (err) => {
          console.log("Continuous GPS stream notice:", err);
        },
        { enableHighAccuracy: true, maximumAge: 2000, timeout: 10000 }
      );
    }

    return () => {
      if (watchId !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, []);

  // Report status on mount
  useEffect(() => {
    const lat = user.lastLocation?.lat || simLocation.lat;
    const lng = user.lastLocation?.lng || simLocation.lng;
    updateLocationInDb(lat, lng, currentHeading, currentSpeed);
  }, []);

  // Fetch emergencies triggered by this user
  useEffect(() => {
    const q = query(collection(db, "emergencies"), where("userId", "==", user.uid));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: EmergencyAlert[] = [];
        snapshot.forEach((doc) => {
          list.push(doc.data() as EmergencyAlert);
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
    heading?: number,
    speed?: number,
    accuracy: number = 30
  ) => {
    const dId = getDeviceId();
    const dName = getDeviceName();
    const effectiveHeading = heading !== undefined ? heading : currentHeading;
    const effectiveSpeed = speed !== undefined ? speed : currentSpeed;

    const locData = {
      lat,
      lng,
      heading: effectiveHeading,
      speed: effectiveSpeed,
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

    // Update global local cache
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
    } catch (error) {
      console.warn("Firestore GPS update notice:", error);
    }
  };

  // Move step in a given direction (North, South, East, West, etc.)
  const moveInDirection = (bearing: number, stepMeters: number = 40) => {
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const rad = toRad(bearing);

    // Approximate meter deltas for latitude and longitude in Nepal
    const deltaLat = (Math.cos(rad) * stepMeters) / 111000;
    const deltaLng = (Math.sin(rad) * stepMeters) / (111000 * Math.cos(toRad(simLocation.lat)));

    const nextLat = simLocation.lat + deltaLat;
    const nextLng = simLocation.lng + deltaLng;
    const simulatedSpeed = 15; // 15 km/h in motion

    setSimLocation({ lat: nextLat, lng: nextLng });
    setCurrentHeading(bearing);
    setCurrentSpeed(simulatedSpeed);
    updateLocationInDb(nextLat, nextLng, bearing, simulatedSpeed, 15);
  };

  // Toggle Continuous Auto-Walking Simulation with direction turns
  const toggleAutoWalk = () => {
    if (isAutoWalking) {
      if (autoWalkIntervalRef.current) clearInterval(autoWalkIntervalRef.current);
      setIsAutoWalking(false);
      setCurrentSpeed(0);
      updateLocationInDb(simLocation.lat, simLocation.lng, currentHeading, 0);
      return;
    }

    setIsAutoWalking(true);
    let stepIndex = 0;
    const bearings = [0, 45, 90, 135, 180, 225, 270, 315];

    autoWalkIntervalRef.current = setInterval(() => {
      stepIndex++;
      const bearing = bearings[stepIndex % bearings.length];
      const rad = (bearing * Math.PI) / 180;
      const stepMeters = 30; // 30m every 2 seconds = ~54 km/h

      setSimLocation((prev) => {
        const deltaLat = (Math.cos(rad) * stepMeters) / 111000;
        const deltaLng = (Math.sin(rad) * stepMeters) / (111000 * Math.cos((prev.lat * Math.PI) / 180));
        const nextLat = prev.lat + deltaLat;
        const nextLng = prev.lng + deltaLng;
        const speed = 18;

        setCurrentHeading(bearing);
        setCurrentSpeed(speed);
        updateLocationInDb(nextLat, nextLng, bearing, speed, 12);

        return { lat: nextLat, lng: nextLng };
      });
    }, 2000);
  };

  useEffect(() => {
    return () => {
      if (autoWalkIntervalRef.current) clearInterval(autoWalkIntervalRef.current);
    };
  }, []);

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
        lat: simLocation.lat,
        lng: simLocation.lng,
        heading: currentHeading,
        speed: currentSpeed,
        accuracy: 30,
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
        lat: simLocation.lat,
        lng: simLocation.lng,
      },
      details: details.trim() || `Urgent ${type} rescue requested in Nepal.`,
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

    try {
      await addDoc(collection(db, "emergencies"), newAlert);

      const userDocRef = doc(db, "users", user.uid);
      await updateDoc(userDocRef, {
        status: targetStatus,
        lastLocation: {
          lat: simLocation.lat,
          lng: simLocation.lng,
          heading: currentHeading,
          speed: currentSpeed,
          accuracy: 25,
          timestamp: new Date().toISOString(),
        },
        updatedAt: new Date().toISOString(),
      });

      setDetails("");
      setMessage({
        type: "success",
        text: `🚨 Active ${type.toUpperCase()} SOS broadcasted! Dispatchers are tracking your coordinates and heading live.`,
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
  const handleMapLocationChange = (lat: number, lng: number) => {
    const bearing = calculateBearing(simLocation.lat, simLocation.lng, lat, lng);
    setSimLocation({ lat, lng });
    setCurrentHeading(bearing);
    updateLocationInDb(lat, lng, bearing, 10);
  };

  const compassData = getCompassDirection(currentHeading);

  return (
    <div className="w-full min-h-screen bg-slate-50 flex flex-col font-sans" id="user-dashboard-wrapper">
      {/* Alert bar when in emergency */}
      {status === "emergency" && (
        <div className="bg-red-600 text-white font-semibold text-center text-sm py-2 animate-pulse flex items-center justify-center gap-1.5 z-50 shadow-sm">
          <Radio className="w-4 h-4 animate-ping" />
          <span>ACTIVE EMERGENCY RADAR LIVE: Dispatch Center tracking your real-time coordinates and direction.</span>
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center text-white shadow-md">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
              Khoji<span className="text-red-600">.com</span>
            </h1>
            <p className="text-[10px] text-slate-400 font-mono">NEPAL EMERGENCY PLATFORM • ACTIVE</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <span className="text-sm font-semibold text-slate-800">{user.fullName}</span>
            <p className="text-[11px] text-slate-500">{user.email}</p>
          </div>
          <button
            onClick={onLogout}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition rounded-lg"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Logout</span>
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
                  className={`w-3 h-3 rounded-full ${
                    status === "emergency"
                      ? "bg-red-500 animate-ping"
                      : status === "lost"
                      ? "bg-amber-500 animate-pulse"
                      : "bg-emerald-500"
                  }`}
                />
                <span className="font-extrabold text-lg text-slate-800 uppercase tracking-tight">
                  Status: {status}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                {status === "emergency" && "Dispatch Agencies tracking your live coordinates and heading."}
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
                  className="px-3 py-1.5 bg-emerald-100 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-lg hover:bg-emerald-200 transition disabled:opacity-50 flex items-center gap-1"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Mark Safe</span>
                </button>
              )}
              {status !== "lost" && status !== "emergency" && (
                <button
                  onClick={() => changeStatus("lost")}
                  disabled={loading}
                  className="px-3 py-1.5 bg-amber-100 border border-amber-200 text-amber-800 text-xs font-bold rounded-lg hover:bg-amber-200 transition disabled:opacity-50"
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
                  ? "bg-indigo-50 text-indigo-800 border-indigo-100"
                  : "bg-red-50 text-red-800 border-red-100"
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
              Facing immediate danger? Push any red rescue button. The agency receives your live GPS coordinates & heading.
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
                className="bg-red-600 hover:bg-red-700 text-white p-3 rounded-xl flex items-center gap-3 transition shadow-md font-bold text-center justify-center text-xs"
              >
                🚨 Police Dispatch (100)
              </button>

              <button
                onClick={() => triggerSOS("ambulance")}
                disabled={loading}
                className="bg-red-500 hover:bg-red-600 text-white p-3 rounded-xl flex items-center gap-3 transition shadow-md font-bold text-center justify-center text-xs"
              >
                🚑 Urgent Ambulance (102)
              </button>

              <button
                onClick={() => triggerSOS("fire")}
                disabled={loading}
                className="bg-orange-600 hover:bg-orange-700 text-white p-3 rounded-xl flex items-center gap-3 transition shadow-md font-bold text-center justify-center text-xs"
              >
                🔥 Fire Brigade (101)
              </button>

              <button
                onClick={() => triggerSOS("lost")}
                disabled={loading}
                className="bg-slate-800 hover:bg-slate-900 text-white p-3 rounded-xl flex items-center gap-3 transition shadow-md font-bold text-center justify-center text-xs"
              >
                ⚠️ Device Stolen Map Alert
              </button>
            </div>
          </div>

          {/* Hotline contacts */}
          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm space-y-4 max-h-[260px] overflow-y-auto">
            <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
              <Phone className="w-4 h-4 text-slate-700" />
              <span>Nepalese Hotline Directory</span>
            </h2>

            <div className="space-y-3 divide-y divide-slate-100">
              {NEPAL_EMERGENCY_CONTACTS.map((contact, idx) => (
                <div key={idx} className={`pt-2.5 ${idx === 0 ? "pt-0" : ""} flex items-start justify-between gap-2`}>
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-slate-800">{contact.name}</span>
                    <p className="text-[11px] text-slate-500 leading-normal">{contact.description}</p>
                    <span className="text-[9px] bg-slate-100 text-slate-500 font-medium px-1.5 py-0.5 rounded-full inline-block">
                      📍 {contact.location}
                    </span>
                  </div>
                  <a
                    href={`tel:${contact.number}`}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-100 font-extrabold text-xs rounded-lg transition"
                  >
                    <Phone className="w-3 h-3" />
                    <span>{contact.number}</span>
                  </a>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Side: Map location & Directional Movement Controls */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex-1 flex flex-col gap-4 min-h-[440px]">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-1.5">
                  <MapPin className="text-indigo-600 w-5 h-5 animate-bounce" />
                  <span>Live Coordinates & Direction Tracker</span>
                </h2>
                <p className="text-xs text-slate-500">
                  Drag the pin or use the directional controls below to test live heading updates on the Admin map.
                </p>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-indigo-600 font-bold bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded-full uppercase font-mono">
                  Live GPS Signal Active
                </span>
              </div>
            </div>

            {/* Coordinates & Compass Direction HUD */}
            <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 text-white grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="flex items-center gap-2">
                <div
                  className="w-9 h-9 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-center flex-shrink-0 transition-transform duration-500"
                  style={{ transform: `rotate(${currentHeading}deg)` }}
                >
                  <Compass className="w-5 h-5 text-indigo-400" />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-mono block uppercase">Direction</span>
                  <span className="font-mono text-xs font-bold text-slate-100">
                    {currentHeading}° {compassData.code} {compassData.arrow}
                  </span>
                </div>
              </div>

              <div>
                <span className="text-[10px] text-slate-400 font-mono block uppercase">Ground Speed</span>
                <span className="font-mono text-xs font-bold text-emerald-400">
                  {currentSpeed > 0 ? `${currentSpeed} km/h` : "Stationary"}
                </span>
              </div>

              <div>
                <span className="text-[10px] text-slate-400 font-mono block uppercase">Latitude</span>
                <span className="font-mono text-xs font-bold text-slate-200">{simLocation.lat.toFixed(5)}</span>
              </div>

              <div>
                <span className="text-[10px] text-slate-400 font-mono block uppercase">Longitude</span>
                <span className="font-mono text-xs font-bold text-slate-200">{simLocation.lng.toFixed(5)}</span>
              </div>
            </div>

            {/* Directional Movement Simulator Pad */}
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Navigation className="w-4 h-4 text-indigo-600" />
                <div>
                  <div className="text-xs font-extrabold text-slate-800">Directional Steering Pad</div>
                  <div className="text-[10px] text-slate-500">Tap to step in any cardinal direction</div>
                </div>
              </div>

              {/* 8-Direction Step Controls */}
              <div className="grid grid-cols-3 gap-1 bg-white p-1.5 rounded-xl border border-slate-200 shadow-sm">
                <button
                  onClick={() => moveInDirection(315)}
                  className="p-2 hover:bg-indigo-50 text-slate-700 hover:text-indigo-600 rounded-lg transition text-xs flex items-center justify-center font-bold"
                  title="North-West (315°)"
                >
                  <ArrowUpLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => moveInDirection(0)}
                  className="p-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg transition text-xs flex items-center justify-center font-bold"
                  title="North (0°)"
                >
                  <ArrowUp className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => moveInDirection(45)}
                  className="p-2 hover:bg-indigo-50 text-slate-700 hover:text-indigo-600 rounded-lg transition text-xs flex items-center justify-center font-bold"
                  title="North-East (45°)"
                >
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => moveInDirection(270)}
                  className="p-2 hover:bg-indigo-50 text-slate-700 hover:text-indigo-600 rounded-lg transition text-xs flex items-center justify-center font-bold"
                  title="West (270°)"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={toggleAutoWalk}
                  className={`p-2 rounded-lg text-xs font-extrabold flex items-center justify-center transition ${
                    isAutoWalking ? "bg-amber-600 text-white animate-pulse" : "bg-slate-900 text-white hover:bg-slate-800"
                  }`}
                  title={isAutoWalking ? "Stop Walking" : "Auto-Walk Mode"}
                >
                  {isAutoWalking ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                </button>
                <button
                  onClick={() => moveInDirection(90)}
                  className="p-2 hover:bg-indigo-50 text-slate-700 hover:text-indigo-600 rounded-lg transition text-xs flex items-center justify-center font-bold"
                  title="East (90°)"
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => moveInDirection(225)}
                  className="p-2 hover:bg-indigo-50 text-slate-700 hover:text-indigo-600 rounded-lg transition text-xs flex items-center justify-center font-bold"
                  title="South-West (225°)"
                >
                  <ArrowDownLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => moveInDirection(180)}
                  className="p-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg transition text-xs flex items-center justify-center font-bold"
                  title="South (180°)"
                >
                  <ArrowDown className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => moveInDirection(135)}
                  className="p-2 hover:bg-indigo-50 text-slate-700 hover:text-indigo-600 rounded-lg transition text-xs flex items-center justify-center font-bold"
                  title="South-East (135°)"
                >
                  <ArrowDownRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Auto Walk button */}
              <button
                onClick={toggleAutoWalk}
                className={`px-3 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition shadow ${
                  isAutoWalking
                    ? "bg-amber-600 text-white border border-amber-500 shadow-amber-500/20"
                    : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/20"
                }`}
              >
                {isAutoWalking ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                <span>{isAutoWalking ? "Stop Walking" : "Auto-Walk Simulator"}</span>
              </button>
            </div>

            {/* Interactive Leaflet Tracking Map */}
            <div className="flex-1 min-h-[320px]">
              <TrackingMap
                simulateLocation={simLocation}
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
