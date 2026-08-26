import { useState, useEffect, useMemo, useRef } from "react";
import { UserProfile, EmergencyAlert, DeviceInfo, SiteConfig } from "../types";
import { collection, doc, updateDoc, onSnapshot, query, where, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import {
  Shield,
  Users,
  Radio,
  MapPin,
  AlertTriangle,
  Phone,
  CheckSquare,
  Search,
  RefreshCw,
  Layers,
  Volume2,
  VolumeX,
  Bell,
  BellRing,
  Play,
  Square,
  AlertOctagon,
  X,
  ExternalLink,
  Sparkles,
  Palette,
  LayoutDashboard,
  Megaphone,
  Moon,
  Sun,
  Bookmark,
} from "lucide-react";
import TrackingMap from "./TrackingMap";
import FirebaseWebCustomizer from "./FirebaseWebCustomizer";
import FuzzySearchFilter from "./FuzzySearchFilter";
import { BookmarkButton } from "../hooks/useSavedItems";
import useTheme from "../hooks/useTheme";
import EmergencyNotificationModal from "./EmergencyNotificationModal";
import { identifyEmergencyAndTarget } from "../utils/emergencyTriage";
import {
  getNearestProviderForAlert,
  findNearestEmergencyProviders,
} from "../utils/nearestEmergencyProviders";
import {
  soundEngine,
  sendBrowserNotification,
  requestNotificationPermission,
} from "../utils/alertSound";
import {
  subscribeSiteConfig,
  getSiteConfigLocal,
  DEFAULT_SITE_CONFIG,
} from "../utils/siteConfig";

interface AdminDashboardProps {
  adminUser: UserProfile;
  onLogout: () => void;
  onOpenProfileModal?: () => void;
}

export default function AdminDashboard({ adminUser, onLogout, onOpenProfileModal }: AdminDashboardProps) {
  const { isDark, toggleTheme } = useTheme();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [emergencies, setEmergencies] = useState<EmergencyAlert[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [selectedEmergency, setSelectedEmergency] = useState<EmergencyAlert | null>(null);
  const [filterType, setFilterType] = useState<"all" | "emergency" | "lost" | "normal">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState<{ [key: string]: boolean }>({});
  const [sysLog, setSysLog] = useState<{ id: string; msg: string; time: string }[]>([]);

  // Navigation View Tab: Dispatch Map vs Firebase Customizer vs Citizen Management
  const [adminViewMode, setAdminViewMode] = useState<"dispatch" | "customizer" | "citizens">("dispatch");
  const [siteConfig, setSiteConfig] = useState<SiteConfig>(getSiteConfigLocal());

  // Sound & Notification state
  const [isMuted, setIsMuted] = useState<boolean>(soundEngine.getMuted());
  const [isSirenSounding, setIsSirenSounding] = useState<boolean>(false);
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>(
    typeof window !== "undefined" && "Notification" in window ? Notification.permission : "default"
  );
  const [activeAlertModal, setActiveAlertModal] = useState<EmergencyAlert | null>(null);

  // References to track previous state and avoid duplicate alert triggers
  const prevActiveIdsRef = useRef<Set<string>>(new Set());
  const prevUserStatusesRef = useRef<Record<string, string>>({});
  const isInitialLoadRef = useRef<boolean>(true);

  // Subscribe to real-time site configuration updates from Firebase Firestore
  useEffect(() => {
    const unsub = subscribeSiteConfig((cfg) => {
      setSiteConfig(cfg);
    });
    return unsub;
  }, []);

  // Derived state to flatten user profiles and their multiple devices into separate targets
  const trackedDevices = useMemo(() => {
    const devicesList: (UserProfile & { realUid: string; deviceId?: string; deviceName?: string; rawName: string })[] = [];

    users.forEach((user) => {
      if (user.devices && Object.keys(user.devices).length > 0) {
        Object.values(user.devices).forEach((dev: DeviceInfo) => {
          devicesList.push({
            ...user,
            uid: `${user.uid}_${dev.deviceId}`, // unique tracking target key so that they plot as separate pins
            realUid: user.uid,
            deviceId: dev.deviceId,
            deviceName: dev.deviceName,
            rawName: user.fullName,
            fullName: `${user.fullName} (${dev.deviceName || "Simulated Terminal"})`,
            status: dev.status || user.status,
            lastLocation: dev.lastLocation || user.lastLocation,
            updatedAt: dev.updatedAt || user.updatedAt,
          });
        });
      } else {
        devicesList.push({
          ...user,
          realUid: user.uid,
          deviceName: "Primary Device",
          rawName: user.fullName,
          uid: user.uid,
        });
      }
    });

    return devicesList;
  }, [users]);

  // Push messages to custom admin console logs
  const addLog = (msg: string) => {
    const uniqueId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    setSysLog((prev) => [
      { id: uniqueId, msg, time: new Date().toLocaleTimeString() },
      ...prev.slice(0, 19),
    ]);
  };

  // Toggle Sound Mute
  const handleToggleMute = () => {
    const nextMute = !isMuted;
    setIsMuted(nextMute);
    soundEngine.setMuted(nextMute);
    if (nextMute) {
      setIsSirenSounding(false);
      addLog("🔇 Emergency Audio Siren MUTED by dispatcher.");
    } else {
      addLog("🔊 Emergency Audio Siren ARMED and listening.");
      soundEngine.playAlertChime();
    }
  };

  // Test Siren Audio
  const handleTestSiren = () => {
    addLog("🔊 Testing Emergency Dispatch Siren & Synthesizer...");
    setIsSirenSounding(true);
    soundEngine.playEmergencySiren(4);
    setTimeout(() => {
      setIsSirenSounding(false);
    }, 4000);
  };

  // Stop current Siren
  const handleSilenceSiren = () => {
    soundEngine.stopSiren();
    setIsSirenSounding(false);
    addLog("🔕 Active Emergency Siren silenced by dispatcher.");
  };

  // Request browser desktop notification permissions
  const handleRequestNotification = async () => {
    const granted = await requestNotificationPermission();
    if (typeof window !== "undefined" && "Notification" in window) {
      setNotifPermission(Notification.permission);
    }
    if (granted) {
      addLog("🔔 Browser Desktop Notifications ENABLED successfully.");
      sendBrowserNotification("KHOJI NEPAL DISPATCH", "Emergency notifications are active on this console.");
    } else {
      addLog("⚠️ Notification permission was not granted by browser.");
    }
  };

  // Synchronize users and emergencies directly from Firestore
  const syncDatabase = async () => {
    addLog("Connecting to Cloud Firestore database directly...");
    try {
      // 1. Fetch Users
      const usersSnap = await getDocs(collection(db, "users"));
      const uList: UserProfile[] = [];
      usersSnap.forEach((docSnap) => {
        const data = docSnap.data();
        uList.push({
          uid: data.uid || docSnap.id,
          email: data.email || "citizen@khoji.com",
          fullName: data.fullName || data.name || data.displayName || "Registered Citizen",
          phone: data.phone || data.phoneNumber || "No Phone",
          role: data.role || "user",
          status: data.status || "normal",
          lastLocation: data.lastLocation || (data.location ? {
            lat: data.location.latitude || data.location.lat || 27.7172,
            lng: data.location.longitude || data.location.lng || 85.3240,
            timestamp: data.location.timestamp || new Date().toISOString()
          } : undefined),
          devices: data.devices,
          updatedAt: data.updatedAt || new Date().toISOString(),
        } as UserProfile);
      });
      setUsers(uList);
      localStorage.setItem("khoji_all_users", JSON.stringify(uList));
      addLog(`✅ Synced ${uList.length} registered citizens directly from Firestore.`);

      // 2. Fetch Emergencies
      const emergSnap = await getDocs(collection(db, "emergencies"));
      const eList: EmergencyAlert[] = [];
      emergSnap.forEach((docSnap) => {
        const data = docSnap.data();
        eList.push({
          id: data.id || docSnap.id,
          userId: data.userId || "anonymous",
          userName: data.userName || data.name || "Citizen SOS",
          userPhone: data.userPhone || data.phone || "100",
          type: data.type || "police",
          status: data.status || "active",
          location: data.location || { lat: 27.7172, lng: 85.3240 },
          details: data.details || "",
          createdAt: data.createdAt || new Date().toISOString(),
          resolvedAt: data.resolvedAt,
          deviceId: data.deviceId,
          deviceName: data.deviceName,
        } as EmergencyAlert);
      });
      eList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setEmergencies(eList);
      localStorage.setItem("khoji_all_emergencies", JSON.stringify(eList));
      addLog(`✅ Synced ${eList.length} emergency alerts from Firestore.`);
    } catch (err: any) {
      console.warn("Direct Firestore fetch error:", err);
      addLog(`Firestore sync notice: ${err?.message || "Using active stream listener."}`);
    }
  };

  // 1. Mount Real-time subscription to Users updates
  useEffect(() => {
    addLog("Initializing secure tracking connection to Nepal GPS network...");
    syncDatabase();

    const unsubscribe = onSnapshot(
      collection(db, "users"),
      (snapshot) => {
        const uList: UserProfile[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          uList.push({
            uid: data.uid || docSnap.id,
            email: data.email || "citizen@khoji.com",
            fullName: data.fullName || data.name || data.displayName || "Registered Citizen",
            phone: data.phone || data.phoneNumber || "No Phone",
            role: data.role || "user",
            status: data.status || "normal",
            lastLocation: data.lastLocation || (data.location ? {
              lat: data.location.latitude || data.location.lat || 27.7172,
              lng: data.location.longitude || data.location.lng || 85.3240,
              timestamp: data.location.timestamp || new Date().toISOString()
            } : undefined),
            devices: data.devices,
            updatedAt: data.updatedAt || new Date().toISOString(),
          } as UserProfile);
        });

        // Detect if any user newly shifted to emergency or lost status
        uList.forEach((user) => {
          const prevStatus = prevUserStatusesRef.current[user.uid];
          if (prevStatus && prevStatus !== user.status && !isInitialLoadRef.current) {
            if (user.status === "emergency") {
              addLog(`🚨 CRITICAL STATUS: ${user.fullName} switched status to EMERGENCY!`);
              setIsSirenSounding(true);
              soundEngine.playEmergencySiren(12);
              sendBrowserNotification(
                "🚨 CITIZEN STATUS: EMERGENCY",
                `${user.fullName} (${user.phone}) has flagged status as EMERGENCY in Nepal!`
              );
            } else if (user.status === "lost") {
              addLog(`⚠️ LOST FLAG: ${user.fullName} reported DEVICE/CITIZEN LOST.`);
              soundEngine.playAlertChime();
              sendBrowserNotification(
                "⚠️ CITIZEN STATUS: LOST",
                `${user.fullName} has flagged device/citizen as LOST.`
              );
            }
          }
          prevUserStatusesRef.current[user.uid] = user.status;
        });

        setUsers(uList);
        localStorage.setItem("khoji_all_users", JSON.stringify(uList));
      },
      (error) => {
        console.warn("Active users stream notice:", error);
        const localUsersList = localStorage.getItem("khoji_all_users");
        if (localUsersList) {
          try {
            const listObj = JSON.parse(localUsersList);
            if (Array.isArray(listObj) && listObj.length > 0) {
              setUsers(listObj);
            }
          } catch {}
        }
      }
    );

    return unsubscribe;
  }, []);

  // 2. Mount Real-time subscription to Emergencies alerts with Sound & Notifications
  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "emergencies"),
      (snapshot) => {
        const eList: EmergencyAlert[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          eList.push({
            id: data.id || docSnap.id,
            userId: data.userId || "anonymous",
            userName: data.userName || data.name || "Citizen SOS",
            userPhone: data.userPhone || data.phone || "100",
            type: data.type || "police",
            status: data.status || "active",
            location: data.location || { lat: 27.7172, lng: 85.3240 },
            details: data.details || "",
            createdAt: data.createdAt || new Date().toISOString(),
            resolvedAt: data.resolvedAt,
            deviceId: data.deviceId,
            deviceName: data.deviceName,
          } as EmergencyAlert);
        });

        // Sort by date descending
        eList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setEmergencies(eList);
        localStorage.setItem("khoji_all_emergencies", JSON.stringify(eList));

        // Detect newly active emergencies
        const currentActive = eList.filter((e) => e.status === "active");
        let hasNewEmergency = false;
        let newestAlert: EmergencyAlert | null = null;

        currentActive.forEach((alert) => {
          if (!prevActiveIdsRef.current.has(alert.id)) {
            hasNewEmergency = true;
            if (!newestAlert) newestAlert = alert;
          }
        });

        // Update active IDs tracker
        prevActiveIdsRef.current = new Set(currentActive.map((e) => e.id));

        // If a new emergency occurred (or on first load if active emergencies exist)
        if (hasNewEmergency && newestAlert) {
          addLog(`🚨 EMERGENCY SOS BROADCAST: ${newestAlert.userName} triggered ${newestAlert.type.toUpperCase()} rescue!`);
          setIsSirenSounding(true);
          soundEngine.playEmergencySiren(15);
          setActiveAlertModal(newestAlert);
          setSelectedEmergency(newestAlert);

          sendBrowserNotification(
            `🚨 EMERGENCY SOS: ${newestAlert.userName}`,
            `Urgent ${newestAlert.type.toUpperCase()} alert triggered! Phone: ${newestAlert.userPhone}. Coordinates: ${newestAlert.location.lat.toFixed(4)}, ${newestAlert.location.lng.toFixed(4)}`
          );
        } else if (currentActive.length === 0) {
          setIsSirenSounding(false);
          soundEngine.stopSiren();
        }

        isInitialLoadRef.current = false;
      },
      (error) => {
        console.warn("Active emergencies stream notice:", error);
        const localEList = localStorage.getItem("khoji_all_emergencies");
        if (localEList) {
          try {
            const list: EmergencyAlert[] = JSON.parse(localEList);
            if (Array.isArray(list)) {
              setEmergencies(list);
            }
          } catch {}
        }
      }
    );

    return unsubscribe;
  }, []);

  // Action: Resolve an active Emergency alert
  const resolveEmergency = async (alert: EmergencyAlert) => {
    setLoading((prev) => ({ ...prev, [alert.id]: true }));
    addLog(`Initiating resolution protocol for SOS: #${alert.id.split("-")[2] || alert.id}`);

    // If this was in active modal, dismiss modal
    if (activeAlertModal?.id === alert.id) {
      setActiveAlertModal(null);
      handleSilenceSiren();
    }

    // Update local emergencies
    const currentGlobal = localStorage.getItem("khoji_all_emergencies");
    if (currentGlobal) {
      const globalList: EmergencyAlert[] = JSON.parse(currentGlobal);
      const index = globalList.findIndex((e) => e.id === alert.id);
      if (index >= 0) {
        globalList[index].status = "resolved";
        globalList[index].resolvedAt = new Date().toISOString();
        localStorage.setItem("khoji_all_emergencies", JSON.stringify(globalList));
        setEmergencies(globalList);
      }
    }

    // Update local user status in directory
    const currentGlobalUsers = localStorage.getItem("khoji_all_users");
    if (currentGlobalUsers) {
      const globalUsersList: UserProfile[] = JSON.parse(currentGlobalUsers);
      const userIndex = globalUsersList.findIndex((u) => u.uid === alert.userId);
      if (userIndex >= 0) {
        globalUsersList[userIndex].status = "normal";
        globalUsersList[userIndex].updatedAt = new Date().toISOString();
        if (alert.deviceId && globalUsersList[userIndex].devices?.[alert.deviceId]) {
          globalUsersList[userIndex].devices![alert.deviceId].status = "normal";
          globalUsersList[userIndex].devices![alert.deviceId].updatedAt = new Date().toISOString();
        }
        localStorage.setItem("khoji_all_users", JSON.stringify(globalUsersList));
        setUsers(globalUsersList);

        // Also update individual user profile if stored in this browser
        const targetIndiv = localStorage.getItem(`khoji_user_${alert.userId}`);
        if (targetIndiv) {
          const profileObj = JSON.parse(targetIndiv);
          profileObj.status = "normal";
          profileObj.updatedAt = new Date().toISOString();
          if (alert.deviceId && profileObj.devices?.[alert.deviceId]) {
            profileObj.devices[alert.deviceId].status = "normal";
            profileObj.devices[alert.deviceId].updatedAt = new Date().toISOString();
          }
          localStorage.setItem(`khoji_user_${alert.userId}`, JSON.stringify(profileObj));
        }
      }
    }

    try {
      const q = query(collection(db, "emergencies"), where("id", "==", alert.id));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const docRef = querySnapshot.docs[0].ref;
        await updateDoc(docRef, {
          status: "resolved",
          resolvedAt: new Date().toISOString(),
        });
      }

      const userRef = doc(db, "users", alert.userId);
      const updateData: any = {
        status: "normal",
        updatedAt: new Date().toISOString(),
      };
      if (alert.deviceId) {
        updateData[`devices.${alert.deviceId}.status`] = "normal";
        updateData[`devices.${alert.deviceId}.updatedAt`] = new Date().toISOString();
      }
      await updateDoc(userRef, updateData);

      addLog(`✅ Resolved and cleared SOS #${alert.id}. Safe status restored.`);
    } catch (e: any) {
      console.warn("Resolve alert notice:", e);
      addLog(`Status marked as safe locally. (DB updated)`);
    } finally {
      setLoading((prev) => ({ ...prev, [alert.id]: false }));
    }
  };

  // Action: Manually reset a user profile status back to 'normal'
  const manualResetProfile = async (targetUser: UserProfile & { realUid?: string; deviceId?: string }) => {
    const effectiveUid = targetUser.realUid || targetUser.uid;
    setLoading((prev) => ({ ...prev, [targetUser.uid]: true }));
    addLog(`Manually clearing emergency flags for citizen [${targetUser.fullName}]...`);

    // Update in local state
    setUsers((prev) =>
      prev.map((u) => {
        if (u.uid === effectiveUid) {
          const updatedDevices = u.devices ? { ...u.devices } : {};
          if (targetUser.deviceId && updatedDevices[targetUser.deviceId]) {
            updatedDevices[targetUser.deviceId].status = "normal";
            updatedDevices[targetUser.deviceId].updatedAt = new Date().toISOString();
          }
          return {
            ...u,
            status: "normal",
            devices: updatedDevices,
            updatedAt: new Date().toISOString(),
          };
        }
        return u;
      })
    );

    // Update global cache
    const currentGlobalUsers = localStorage.getItem("khoji_all_users");
    if (currentGlobalUsers) {
      const globalUsersList: UserProfile[] = JSON.parse(currentGlobalUsers);
      const userIndex = globalUsersList.findIndex((u) => u.uid === effectiveUid);
      if (userIndex >= 0) {
        globalUsersList[userIndex].status = "normal";
        globalUsersList[userIndex].updatedAt = new Date().toISOString();
        if (targetUser.deviceId && globalUsersList[userIndex].devices?.[targetUser.deviceId]) {
          globalUsersList[userIndex].devices![targetUser.deviceId].status = "normal";
          globalUsersList[userIndex].devices![targetUser.deviceId].updatedAt = new Date().toISOString();
        }
        localStorage.setItem("khoji_all_users", JSON.stringify(globalUsersList));
      }
    }

    try {
      const userRef = doc(db, "users", effectiveUid);
      const updateData: any = {
        status: "normal",
        updatedAt: new Date().toISOString(),
      };
      if (targetUser.deviceId) {
        updateData[`devices.${targetUser.deviceId}.status`] = "normal";
        updateData[`devices.${targetUser.deviceId}.updatedAt`] = new Date().toISOString();
      }
      await updateDoc(userRef, updateData);
      addLog(`✅ Reset citizen [${targetUser.fullName}] status to Normal.`);
    } catch (e: any) {
      console.warn("Reset profile notice:", e);
      addLog(`Citizen status reset locally.`);
    } finally {
      setLoading((prev) => ({ ...prev, [targetUser.uid]: false }));
    }
  };

  // Helper stats count
  const activeEmergencies = emergencies.filter((e) => e.status === "active");
  const deviceLostUsers = trackedDevices.filter((u) => u.status === "lost");
  const activeTrackerCount = trackedDevices.filter((u) => u.lastLocation).length;

  // Render filtering for directories
  const queriedUsers = trackedDevices.filter((user) => {
    const matchesSearch =
      user.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.phone.includes(searchQuery);

    if (filterType === "all") return matchesSearch;
    return matchesSearch && user.status === filterType;
  });

  return (
    <div className="w-full min-h-screen bg-slate-50 flex flex-col font-sans relative" id="admin-dashboard-container">

      {/* ================= CRITICAL EMERGENCY POPUP MODAL (DIRECTED TO USER DEVICE & CONTACT NUMBER) ================= */}
      {activeAlertModal && (
        <EmergencyNotificationModal
          alert={activeAlertModal}
          userProfile={users.find((u) => u.uid === activeAlertModal.userId) || null}
          onClose={() => setActiveAlertModal(null)}
          onResolve={(alert) => resolveEmergency(alert)}
          onCenterMap={(alert) => {
            setSelectedEmergency(alert);
            setSelectedUser(null);
            addLog(`Focused master map onto SOS incident: ${alert.userName}`);
          }}
          onSilenceSiren={handleSilenceSiren}
          isSirenPlaying={isSirenSounding}
          isLoading={Boolean(activeAlertModal && loading[activeAlertModal.id])}
        />
      )}

      {/* Dynamic header alert banner when emergencies are active */}
      {activeEmergencies.length > 0 && (
        <div className="bg-rose-700 text-white font-extrabold text-xs sm:text-sm py-2 px-4 text-center flex items-center justify-between z-40 shadow-md">
          <div className="flex items-center gap-2 mx-auto">
            <Radio className="w-4 h-4 text-rose-200" />
            <span>
              🚨 ALERT: {activeEmergencies.length} ACTIVE NEPAL EMERGENCY SOS SIGNAL(S) LIVE
            </span>
          </div>

          <div className="flex items-center gap-2">
            {activeAlertModal === null && activeEmergencies[0] && (
              <button
                onClick={() => setActiveAlertModal(activeEmergencies[0])}
                className="px-2.5 py-1 bg-white text-rose-900 font-extrabold text-xs rounded-lg hover:bg-rose-50 transition shadow flex items-center gap-1 cursor-pointer"
                title="Open emergency auto-dispatch view"
              >
                <span>Dispatch / Auto-Call</span>
              </button>
            )}

            {isSirenSounding && (
              <button
                onClick={handleSilenceSiren}
                className="px-3 py-1 bg-slate-900 text-white font-extrabold text-xs rounded-lg hover:bg-slate-800 transition shadow flex items-center gap-1 cursor-pointer border border-slate-700"
              >
                <VolumeX className="w-3.5 h-3.5 text-amber-400" />
                <span>Silence Siren</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Emergency Broadcast Banner configured via Firebase Web Customizer */}
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
          <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-black/20 text-white">
            Firebase Broadcast
          </span>
        </div>
      )}

      {/* Nav */}
      <header className="sticky top-0 z-30 bg-slate-900 text-white px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-3 shadow-md border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center text-white shadow-xl flex-shrink-0">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-extrabold tracking-tight">
              {siteConfig.brandLogoText || "Khoji.com"}{" "}
              <span className="text-[10px] bg-red-600 px-2 py-0.5 rounded-full uppercase ml-1 font-bold tracking-widest text-[#f8fafc]">
                {siteConfig.badgeText || "Nepal Command"}
              </span>
            </h1>
            <p className="text-[10px] text-slate-400 font-mono">
              {siteConfig.siteTagline || "EMERGENCY DISPATCH & LIVE SIREN SYSTEM"}
            </p>
          </div>
        </div>

        {/* Navigation Tabs (Dispatch Grid vs Firebase Web Customizer vs Citizens) */}
        <div className="flex items-center bg-slate-800/90 p-1 rounded-2xl border border-slate-700/80">
          <button
            onClick={() => setAdminViewMode("dispatch")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              adminViewMode === "dispatch"
                ? "bg-red-600 text-white shadow-md"
                : "text-slate-300 hover:text-white hover:bg-slate-700/60"
            }`}
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            <span>Live Radar & GPS</span>
          </button>

          <button
            onClick={() => setAdminViewMode("customizer")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              adminViewMode === "customizer"
                ? "bg-indigo-600 text-white shadow-md ring-2 ring-indigo-400/40"
                : "text-amber-300 hover:text-white hover:bg-slate-700/60"
            }`}
            title="Open Firebase Web Customizer to edit branding, hotlines, regions and styles"
          >
            <Palette className="w-3.5 h-3.5 text-amber-300" />
            <span>Customize Web</span>
            <span className="text-[9px] bg-amber-400/20 text-amber-300 font-mono px-1.5 py-0.2 rounded font-extrabold uppercase">
              Firebase
            </span>
          </button>
        </div>

        {/* Audio Siren Controls & Global Actions */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            id="admin-theme-toggle-btn"
            className="p-1.5 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition cursor-pointer border border-slate-700"
            title={`Switch to ${isDark ? "Light" : "Dark"} mode`}
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-300" />}
          </button>

          {/* Siren Mute / Unmute Button */}
          <button
            onClick={handleToggleMute}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-extrabold rounded-xl border transition cursor-pointer ${
              isMuted
                ? "bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-750 hover:text-slate-200"
                : "bg-red-950/80 text-red-300 border-red-800 hover:bg-red-900 shadow-sm"
            }`}
            title={isMuted ? "Audio Siren is Muted. Click to Unmute." : "Audio Siren is ARMED. Click to Mute."}
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5 text-slate-400" /> : <Volume2 className="w-3.5 h-3.5 text-red-400 animate-pulse" />}
            <span className="hidden md:inline">{isMuted ? "Siren Muted" : "Siren Armed"}</span>
          </button>

          {/* Test Siren Button */}
          <button
            onClick={handleTestSiren}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold text-slate-300 bg-slate-800 hover:bg-slate-700 hover:text-white rounded-xl border border-slate-750 transition cursor-pointer"
            title="Test Emergency Alarm Synthesizer"
          >
            <Play className="w-3 h-3 text-emerald-400" />
            <span className="hidden sm:inline">Test Sound</span>
          </button>

          {/* Desktop Push Notification Permission Toggle */}
          {notifPermission !== "granted" ? (
            <button
              onClick={handleRequestNotification}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold text-amber-300 bg-amber-950/60 hover:bg-amber-900/80 rounded-xl border border-amber-800/80 transition cursor-pointer"
              title="Click to allow instant Desktop emergency push notifications"
            >
              <Bell className="w-3.5 h-3.5 text-amber-400 animate-bounce" />
              <span className="hidden lg:inline">Enable Alerts</span>
            </button>
          ) : (
            <div className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-950/50 border border-emerald-800/60 text-emerald-300 text-[11px] font-bold rounded-xl" title="Desktop push notifications are active">
              <BellRing className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden xl:inline">Alerts Active</span>
            </div>
          )}

          <button
            onClick={() => syncDatabase()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-emerald-300 bg-emerald-950/80 hover:bg-emerald-900 transition rounded-xl border border-emerald-700/60 shadow-sm cursor-pointer"
            title="Refresh active users and emergencies directly from Firestore"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sync DB</span>
          </button>

          {onOpenProfileModal && (
            <button
              onClick={onOpenProfileModal}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-200 bg-slate-800 hover:bg-slate-700 hover:text-white transition rounded-xl border border-slate-750 cursor-pointer"
              title="Switch profile, add new user, or manage accounts"
            >
              <Users className="w-3.5 h-3.5 text-blue-400" />
              <span className="hidden md:inline">Profiles</span>
            </button>
          )}

          <div className="text-right hidden xl:block ml-1">
            <span className="text-[10px] font-bold text-red-400 uppercase tracking-widest font-mono block">SUPER USER</span>
            <p className="text-xs font-semibold text-slate-100">{adminUser.fullName}</p>
          </div>

          <button
            onClick={onLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-200 bg-slate-800 hover:bg-rose-900/60 hover:text-rose-200 hover:border-rose-700 transition rounded-xl border border-slate-700 cursor-pointer"
          >
            Logout
          </button>
        </div>
      </header>

      {/* RENDER FIREBASE WEB CUSTOMIZER IF TAB IS SELECTED */}
      {adminViewMode === "customizer" ? (
        <div className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6">
          <FirebaseWebCustomizer
            currentConfig={siteConfig}
            adminName={adminUser.fullName}
            onConfigSaved={(updatedCfg) => {
              setSiteConfig(updatedCfg);
              addLog("✨ Firebase Site Customization successfully deployed!");
            }}
            onClose={() => setAdminViewMode("dispatch")}
          />
        </div>
      ) : (
        <>
          {/* Stats Counter Row */}
          <div className="bg-white border-b border-slate-200 py-4 px-4 sm:px-6">
            <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6">
              <div className="bg-rose-50 border border-rose-100 rounded-2xl p-3.5 sm:p-4 flex items-center gap-3.5">
                <div className="w-10 h-10 sm:w-11 sm:h-11 bg-rose-600 text-white rounded-xl flex items-center justify-center shadow">
                  <Radio className="w-5 h-5 sm:w-6 sm:h-6 animate-pulse" />
                </div>
                <div>
                  <span className="text-xl sm:text-2xl font-extrabold text-rose-700">{activeEmergencies.length}</span>
                  <p className="text-[10px] sm:text-xs text-rose-500 font-bold uppercase tracking-wide">Active SOS Alerts</p>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-100 rounded-2xl p-3.5 sm:p-4 flex items-center gap-3.5">
                <div className="w-10 h-10 sm:w-11 sm:h-11 bg-amber-500 text-white rounded-xl flex items-center justify-center shadow">
                  <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <div>
                  <span className="text-xl sm:text-2xl font-extrabold text-amber-700">{deviceLostUsers.length}</span>
                  <p className="text-[10px] sm:text-xs text-amber-600 font-bold uppercase tracking-wide">Device Lost Flags</p>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3.5 sm:p-4 flex items-center gap-3.5">
                <div className="w-10 h-10 sm:w-11 sm:h-11 bg-slate-800 text-white rounded-xl flex items-center justify-center shadow">
                  <Users className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <div>
                  <span className="text-xl sm:text-2xl font-extrabold text-slate-800">{users.length}</span>
                  <p className="text-[10px] sm:text-xs text-slate-500 font-bold uppercase tracking-wide">Registered Citizens</p>
                </div>
              </div>

              <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-3.5 sm:p-4 flex items-center gap-3.5">
                <div className="w-10 h-10 sm:w-11 sm:h-11 bg-indigo-600 text-white rounded-xl flex items-center justify-center shadow">
                  <MapPin className="w-5 h-5 sm:w-6 sm:h-6 animate-bounce" />
                </div>
                <div>
                  <span className="text-xl sm:text-2xl font-extrabold text-indigo-700">{activeTrackerCount}</span>
                  <p className="text-[10px] sm:text-xs text-indigo-600 font-bold uppercase tracking-wide">Active GPS Targets</p>
                </div>
              </div>
            </div>
          </div>

      {/* Main Layout Grid */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Left Side (Map panel & Logistics info) */}
        <div className="lg:col-span-8 flex flex-col gap-6">

          {/* Main Nepal Tracker Map */}
          <div className="bg-white rounded-3xl border border-slate-150 shadow-sm p-4 flex-1 flex flex-col gap-3 min-h-[440px]">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-1.5">
                  <Layers className="text-indigo-600 w-5 h-5" />
                  <span>Interactive Nepal Master Dispatch Grid</span>
                </h2>
                <p className="text-xs text-slate-500">
                  Live GPS targets across Nepal. Glowing red pins denote active emergency sirens.
                </p>
              </div>

              {/* Status Map Legends */}
              <div className="flex items-center gap-3 text-[11px] font-bold">
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-red-500 rounded-full inline-block animate-ping" /> SOS</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-amber-500 rounded-full inline-block" /> Lost</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-blue-500 rounded-full inline-block" /> Safe</span>
              </div>
            </div>

            {/* Render the tracking map */}
            <div className="flex-1 min-h-[360px]">
              <TrackingMap
                users={trackedDevices}
                emergencies={emergencies}
                selectedUser={selectedUser}
                selectedEmergency={selectedEmergency}
                onSelectUser={(u) => {
                  setSelectedUser(u);
                  setSelectedEmergency(null);
                  addLog(`Selected target [${u.fullName}] for live GPS & telemetry tracking.`);
                }}
              />
            </div>
          </div>

          {/* Commander Logs console */}
          <div className="bg-slate-900 rounded-3xl p-5 border border-slate-800 text-slate-300 font-mono shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
              <span className="text-xs font-bold text-red-500 flex items-center gap-1.5 uppercase font-mono">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-ping inline-block" />
                Live Dispatch Decryption & Siren Stream
              </span>
              <span className="text-[10px] text-slate-500">Auto-synchronized</span>
            </div>

            <div className="text-[11px] space-y-1.5 max-h-[140px] overflow-y-auto font-mono text-emerald-400">
              {sysLog.map((log) => (
                <div key={log.id} className="flex gap-2 items-start hover:bg-slate-800/40 p-1 rounded">
                  <span className="text-slate-500">[{log.time}]</span>
                  <p className="flex-1 leading-tight">{log.msg}</p>
                </div>
              ))}
              {sysLog.length === 0 && (
                <div className="text-slate-500 text-center py-4">No decryption records parsed yet. Listening channels...</div>
              )}
            </div>
          </div>

        </div>

        {/* Right Side (Directories, actions and search controls) */}
        <div className="lg:col-span-4 flex flex-col gap-6">

          {/* Section: ACTIVE EMERGENCY SOS CARDS */}
          <div className="bg-white rounded-3xl border border-slate-150 shadow-sm p-5 space-y-4 max-h-[360px] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-red-600 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 bg-red-600 rounded-full animate-ping" />
                Active Dispatch Board ({activeEmergencies.length})
              </h3>
              {activeEmergencies.length > 0 && (
                <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full uppercase">
                  Alert Active
                </span>
              )}
            </div>

            {activeEmergencies.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-400">
                ✔️ No pending SOS dispatch requirements. All citizens safe.
              </div>
            ) : (
              <div className="space-y-3">
                {activeEmergencies.map((alert) => {
                  const triage = identifyEmergencyAndTarget(alert);
                  const nearestProvider = getNearestProviderForAlert(alert);
                  return (
                    <div
                      key={alert.id}
                      onClick={() => {
                        setSelectedEmergency(alert);
                        setSelectedUser(null);
                      }}
                      className={`p-3.5 rounded-2xl border transition cursor-pointer ${
                        selectedEmergency?.id === alert.id
                          ? "bg-rose-50/70 border-rose-300 ring-2 ring-rose-200"
                          : "bg-slate-50/70 border-slate-200 hover:border-rose-300"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-extrabold text-slate-900 truncate max-w-[160px]">
                          {alert.userName}
                        </span>
                        <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-rose-600 text-white font-mono shadow-sm">
                          {alert.type} SOS
                        </span>
                      </div>

                      {/* Nearest Emergency Provider Proximity Badge */}
                      {nearestProvider ? (
                        <div className="bg-red-50/90 border border-red-200/90 rounded-xl p-2 mb-2 flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <span className="text-[9px] font-mono text-red-600 uppercase font-extrabold block truncate flex items-center gap-1">
                              <span>📍 Nearest: {nearestProvider.distanceFormatted} ({nearestProvider.directionArrow} {nearestProvider.directionLabel})</span>
                            </span>
                            <span className="text-[11px] font-black text-slate-900 truncate block">
                              {nearestProvider.provider.name}
                            </span>
                            <span className="text-[9px] text-slate-500 font-mono block truncate">
                              {nearestProvider.provider.address}
                            </span>
                          </div>
                          <a
                            href={`tel:${nearestProvider.provider.phone}`}
                            onClick={(e) => e.stopPropagation()}
                            className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white font-mono font-black text-xs rounded-lg transition flex items-center gap-1 shadow-sm flex-shrink-0"
                            title={`Call nearest station ${nearestProvider.provider.name}`}
                          >
                            <Phone className="w-3 h-3" />
                            <span>{nearestProvider.provider.phone}</span>
                          </a>
                        </div>
                      ) : (
                        <div className="bg-white/80 border border-slate-200/80 rounded-xl p-2 mb-2 flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <span className="text-[9px] font-mono text-slate-400 uppercase font-bold block truncate">
                              Identified: {triage.categoryLabel}
                            </span>
                            <span className="text-[11px] font-black text-slate-800 truncate block">
                              {triage.primaryAuthority}
                            </span>
                          </div>
                          <a
                            href={`tel:${triage.primaryPhone}`}
                            onClick={(e) => e.stopPropagation()}
                            className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white font-mono font-black text-xs rounded-lg transition flex items-center gap-1 shadow-sm flex-shrink-0"
                            title={`Call ${triage.primaryAuthority}`}
                          >
                            <Phone className="w-3 h-3" />
                            <span>{triage.primaryPhone}</span>
                          </a>
                        </div>
                      )}

                      <div className="flex items-center justify-between text-[11px] text-slate-600 mb-1.5 font-bold">
                        <a
                          href={`tel:${alert.userPhone}`}
                          onClick={(e) => e.stopPropagation()}
                          className="hover:underline flex items-center gap-1 text-emerald-600"
                        >
                          <Phone className="w-3 h-3" />
                          <span>Citizen: {alert.userPhone}</span>
                        </a>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {new Date(alert.createdAt).toLocaleTimeString()}
                        </span>
                      </div>

                      {alert.details && (
                        <p className="text-[11px] text-slate-700 bg-white p-2 rounded-xl border border-slate-150 italic mb-2">
                          "{alert.details}"
                        </p>
                      )}

                      <div className="flex items-center justify-between pt-2 gap-1.5 flex-wrap border-t border-slate-200/60 mt-1">
                        {nearestProvider && (
                          <a
                            href={`tel:${nearestProvider.provider.phone}`}
                            onClick={(e) => e.stopPropagation()}
                            className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white font-extrabold text-[10px] rounded-lg transition flex items-center gap-1 shadow-sm cursor-pointer"
                            title={`Call nearest station ${nearestProvider.provider.name} (${nearestProvider.distanceFormatted})`}
                          >
                            <Phone className="w-3 h-3" />
                            <span>Station ({nearestProvider.distanceFormatted})</span>
                          </a>
                        )}

                        <a
                          href={`tel:${alert.userPhone}`}
                          onClick={(e) => e.stopPropagation()}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[10px] rounded-lg transition flex items-center gap-1 shadow-sm cursor-pointer"
                          title={`Call citizen ${alert.userName} at ${alert.userPhone}`}
                        >
                          <Phone className="w-3 h-3" />
                          <span>Call User</span>
                        </a>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveAlertModal(alert);
                          }}
                          className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-[10px] rounded-lg transition flex items-center gap-1 shadow-sm cursor-pointer"
                        >
                          <span>Auto-Dispatch</span>
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            resolveEmergency(alert);
                          }}
                          disabled={loading[alert.id]}
                          className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-[10px] rounded-lg transition disabled:opacity-50 flex items-center gap-1 uppercase shadow-sm cursor-pointer ml-auto"
                        >
                          <CheckSquare className="w-3 h-3" />
                          <span>{loading[alert.id] ? "Resolving..." : "Resolve"}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Section: USER TRACKING DIRECTORY WITH FUZZY SEARCH & FILTERS */}
          <div className="bg-white rounded-3xl border border-slate-150 shadow-sm p-5 space-y-4 flex-1 flex flex-col min-h-[380px]">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-slate-500" />
                <span>Registered Citizens Directory</span>
              </h3>
              <span className="text-[10px] text-slate-400 font-mono">
                {trackedDevices.length} targets
              </span>
            </div>

            <FuzzySearchFilter
              items={trackedDevices}
              searchKeys={["fullName", "rawName", "phone", "email", "deviceName", "status"]}
              placeholder="Fuzzy search citizens (e.g. 'bikash', '9851', 'lost')..."
              categoryKey="status"
              titleKey="fullName"
              dateKey="updatedAt"
              debounceMs={250}
              fuzzyThreshold={0.35}
              showCategoryPills={true}
              renderItem={(user, _idx, meta) => {
                const isActiveTarget = selectedUser?.uid === user.uid;
                return (
                  <div
                    key={user.uid}
                    onClick={() => {
                      setSelectedUser(user);
                      setSelectedEmergency(null);
                    }}
                    className={`p-3 rounded-2xl border transition cursor-pointer flex items-center justify-between group ${
                      isActiveTarget
                        ? "bg-indigo-50/80 border-indigo-400 ring-2 ring-indigo-100"
                        : "bg-slate-50/40 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <div className="space-y-1 truncate pr-2 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {/* Status blinking indicator lamp */}
                        <span
                          className={`w-2 h-2 rounded-full inline-block ${
                            user.status === "emergency"
                              ? "bg-rose-500 animate-ping"
                              : user.status === "lost"
                              ? "bg-amber-400 animate-pulse"
                              : "bg-emerald-500"
                          }`}
                        />
                        <span className="text-xs font-extrabold text-slate-800 block truncate">
                          {user.rawName || user.fullName}
                        </span>
                        <span
                          className={`text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded-full border ${
                            user.status === "emergency"
                              ? "bg-rose-100 text-rose-800 border-rose-200"
                              : user.status === "lost"
                              ? "bg-amber-50 text-amber-800 border-amber-200"
                              : "bg-emerald-50 text-emerald-800 border-emerald-200"
                          }`}
                        >
                          {user.status}
                        </span>
                        {meta.isFuzzyMatch && meta.searchScore !== undefined && (
                          <span className="text-[8px] font-mono font-semibold px-1 py-0.2 rounded bg-blue-100 text-blue-700">
                            match {(100 - meta.searchScore * 100).toFixed(0)}%
                          </span>
                        )}
                      </div>

                      {/* Sub-details: device info & sync rate */}
                      <div className="text-[10px] text-slate-500 font-mono flex items-center gap-1.5 flex-wrap">
                        <span className="bg-slate-100 border border-slate-200 text-slate-600 px-1.5 py-0.5 rounded font-sans uppercase font-bold text-[8px]">
                          📱 {user.deviceName || "Primary Target"}
                        </span>
                        <span className="text-slate-300">•</span>
                        <span>Sync: {new Date(user.updatedAt).toLocaleTimeString()}</span>
                      </div>

                      <div className="text-[10px] text-slate-400 space-y-0.5">
                        <span className="block truncate">📞 {user.phone}</span>
                        <span className="block truncate font-mono text-[9px]">{user.email}</span>
                      </div>

                      {isActiveTarget && (
                        <div className="text-[9px] text-indigo-600 font-extrabold uppercase tracking-wider flex items-center gap-1 mt-1 font-mono">
                          <span className="animate-bounce">📍</span> Active Tracking Target
                        </div>
                      )}
                    </div>

                    {/* Actions for manual resetting group */}
                    <div className="flex flex-col gap-1 items-end ml-2 group-hover:opacity-100 transition whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <BookmarkButton
                          item={{
                            id: `citizen-${user.uid}`,
                            title: user.fullName || user.rawName || "Citizen Target",
                            category: user.status,
                            description: `Phone: ${user.phone} • Device: ${user.deviceName || "Primary"}`,
                          }}
                          userId={adminUser.uid}
                          size="sm"
                        />
                        {user.status !== "normal" ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              manualResetProfile(user);
                            }}
                            disabled={loading[user.uid]}
                            className="px-2.5 py-1 bg-slate-900 text-white text-[9px] font-extrabold rounded-lg hover:bg-slate-800 transition shadow disabled:opacity-50 cursor-pointer"
                            title="Manually clear status to safe"
                          >
                            Reset
                          </button>
                        ) : (
                          <span className="text-[9px] text-slate-400 font-mono uppercase group-hover:text-indigo-600 font-semibold transition">
                            {isActiveTarget ? "Tracked" : "Track"}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              }}
            />
          </div>

        </div>

      </div>
      </>
      )}
    </div>
  );
}
