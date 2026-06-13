import { useState, useEffect } from "react";
import { UserProfile, EmergencyAlert } from "../types";
import { collection, doc, updateDoc, onSnapshot, query, where, getDocs } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../firebase";
import { Shield, Users, Radio, MapPin, AlertTriangle, Phone, CheckSquare, Search, RefreshCw, Layers } from "lucide-react";
import TrackingMap from "./TrackingMap";
import { NEPAL_EMERGENCY_CONTACTS } from "../utils/nepalContacts";

interface AdminDashboardProps {
  adminUser: UserProfile;
  onLogout: () => void;
}

export default function AdminDashboard({ adminUser, onLogout }: AdminDashboardProps) {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [emergencies, setEmergencies] = useState<EmergencyAlert[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [selectedEmergency, setSelectedEmergency] = useState<EmergencyAlert | null>(null);
  const [filterType, setFilterType] = useState<"all" | "emergency" | "lost" | "normal">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState<{ [key: string]: boolean }>({});
  const [sysLog, setSysLog] = useState<{ id: string; msg: string; time: string }[]>([]);

  // Push messages to custom admin console logs
  const addLog = (msg: string) => {
    setSysLog((prev) => [
      { id: String(Date.now()), msg, time: new Date().toLocaleTimeString() },
      ...prev.slice(0, 19),
    ]);
  };

  // 1. Mount Real-time subscription to Users updates
  useEffect(() => {
    addLog("Initializing secure tracking connection to Nepal GPS network...");
    const unsubscribe = onSnapshot(
      collection(db, "users"),
      (snapshot) => {
        const uList: UserProfile[] = [];
        snapshot.forEach((doc) => {
          uList.push(doc.data() as UserProfile);
        });
        setUsers(uList);
        addLog(`Synchronized active tracking signals for ${uList.length} users successfully.`);
        localStorage.setItem("khoji_all_users", JSON.stringify(uList));
      },
      (error) => {
        console.warn("Active users stream blocked. Activating local directory backup.", error);
        // Fallback to local
        const localUsersList = localStorage.getItem("khoji_all_users");
        if (localUsersList) {
          const listObj = JSON.parse(localUsersList);
          setUsers(listObj);
          addLog(`[Local Fallback] Synchronized active local tracking signals for ${listObj.length} users.`);
        } else {
          // Provide default simulation users
          const defaultUsers: UserProfile[] = [
            {
              uid: "sandbox-citizen",
              email: "citizen@khoji.com",
              fullName: "Citizen Responder (Local Sample)",
              phone: "9851080002",
              role: "user",
              status: "emergency",
              lastLocation: { lat: 27.7172, lng: 85.3240, timestamp: new Date().toISOString() },
              updatedAt: new Date().toISOString(),
            }
          ];
          setUsers(defaultUsers);
          localStorage.setItem("khoji_all_users", JSON.stringify(defaultUsers));
          addLog("Synchronized offline Nepal GPS directory.");
        }
      }
    );

    return unsubscribe;
  }, []);

  // 2. Mount Real-time subscription to Emergencies alerts
  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "emergencies"),
      (snapshot) => {
        const eList: EmergencyAlert[] = [];
        snapshot.forEach((doc) => {
          eList.push(doc.data() as EmergencyAlert);
        });
        // Sort by date descending
        eList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setEmergencies(eList);
        localStorage.setItem("khoji_all_emergencies", JSON.stringify(eList));
        
        // Count active alerts to notify
        const activeCount = eList.filter((e) => e.status === "active").length;
        if (activeCount > 0) {
          addLog(`⚠️ CRITICAL: ${activeCount} active emergency dispatch protocols require resolution!`);
        } else {
          addLog("All Nepalese SOS streams cleared. Scanning networks.");
        }
      },
      (error) => {
        console.warn("Active emergencies stream blocked. Activating local SOS alert dispatcher fallback.", error);
        const localEList = localStorage.getItem("khoji_all_emergencies");
        if (localEList) {
          const list: EmergencyAlert[] = JSON.parse(localEList);
          setEmergencies(list);
          const activeCount = list.filter((e) => e.status === "active").length;
          addLog(`[Local Fallback] Loaded ${list.length} local emergency alerts. Count active: ${activeCount}.`);
        } else {
          const defaultEmergencies: EmergencyAlert[] = [
            {
              id: "emergency-local-demo",
              userId: "sandbox-citizen",
              userName: "Citizen Responder (Local Sample)",
              userPhone: "9851080002",
              type: "police",
              status: "active",
              location: { lat: 27.7172, lng: 85.3240 },
              details: "Stolen phone map alert test near Kathmandu Durbar Square.",
              createdAt: new Date().toISOString(),
            }
          ];
          setEmergencies(defaultEmergencies);
          localStorage.setItem("khoji_all_emergencies", JSON.stringify(defaultEmergencies));
          addLog("Loaded default dispatch channel.");
        }
      }
    );

    return unsubscribe;
  }, []);

  // Action: Resolve an active Emergency alert
  const resolveEmergency = async (alert: EmergencyAlert) => {
    setLoading((prev) => ({ ...prev, [alert.id]: true }));
    addLog(`Initiating resolution protocol for SOS: #${alert.id.split("-")[2]}`);

    // Update local emergencies
    const currentGlobal = localStorage.getItem("khoji_all_emergencies");
    if (currentGlobal) {
      const globalList: EmergencyAlert[] = JSON.parse(currentGlobal);
      const index = globalList.findIndex(e => e.id === alert.id);
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
      const userIndex = globalUsersList.findIndex(u => u.uid === alert.userId);
      if (userIndex >= 0) {
        globalUsersList[userIndex].status = "normal";
        globalUsersList[userIndex].updatedAt = new Date().toISOString();
        localStorage.setItem("khoji_all_users", JSON.stringify(globalUsersList));
        setUsers(globalUsersList);
        
        // Also update individual user profile if stored in this browser
        const targetIndiv = localStorage.getItem(`khoji_user_${alert.userId}`);
        if (targetIndiv) {
          const profileObj = JSON.parse(targetIndiv);
          profileObj.status = "normal";
          profileObj.updatedAt = new Date().toISOString();
          localStorage.setItem(`khoji_user_${alert.userId}`, JSON.stringify(profileObj));
        }
      }
    }

    try {
      // 1. Mark emergency status as resolved in its own document
      // Let's find the auto-ID of this document inside the emergencies collection by querying
      const q = query(collection(db, "emergencies"), where("id", "==", alert.id));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const docRef = querySnapshot.docs[0].ref;
        await updateDoc(docRef, {
          status: "resolved",
          resolvedAt: new Date().toISOString(),
        });
      }

      // 2. Reset the affected user's state back to 'normal'
      const userRef = doc(db, "users", alert.userId);
      await updateDoc(userRef, {
        status: "normal",
        updatedAt: new Date().toISOString(),
      });

      addLog(`Incident #${alert.id.split("-")[2]} resolved. Victim [${alert.userName}] status reset to normal.`);
    } catch (err) {
      console.warn("Firestore resolve deferred. Stored locally.", err);
      addLog(`Incident #${alert.id.split("-")[2]} resolved locally. Victim [${alert.userName}] status cleared.`);
    } finally {
      setLoading((prev) => ({ ...prev, [alert.id]: false }));
    }
  };

  // Action: Force manual status reset to normal for any user (great for stolen devices successfully found)
  const manualResetProfile = async (targetUser: UserProfile) => {
    setLoading((prev) => ({ ...prev, [targetUser.uid]: true }));
    addLog(`Resetting device status manually for: ${targetUser.fullName}`);

    // Update local list
    const currentGlobalUsers = localStorage.getItem("khoji_all_users");
    if (currentGlobalUsers) {
      const globalUsersList: UserProfile[] = JSON.parse(currentGlobalUsers);
      const userIndex = globalUsersList.findIndex(u => u.uid === targetUser.uid);
      if (userIndex >= 0) {
        globalUsersList[userIndex].status = "normal";
        globalUsersList[userIndex].updatedAt = new Date().toISOString();
        localStorage.setItem("khoji_all_users", JSON.stringify(globalUsersList));
        setUsers(globalUsersList);
        
        const targetIndiv = localStorage.getItem(`khoji_user_${targetUser.uid}`);
        if (targetIndiv) {
          const profileObj = JSON.parse(targetIndiv);
          profileObj.status = "normal";
          profileObj.updatedAt = new Date().toISOString();
          localStorage.setItem(`khoji_user_${targetUser.uid}`, JSON.stringify(profileObj));
        }
      }
    }

    try {
      const userRef = doc(db, "users", targetUser.uid);
      await updateDoc(userRef, {
        status: "normal",
        updatedAt: new Date().toISOString(),
      });
      addLog(`Manual status reset complete for user ${targetUser.fullName}.`);
    } catch (err) {
      console.warn("Firestore reset status deferred.", err);
      addLog(`Manual status reset complete (locally secured) for ${targetUser.fullName}.`);
    } finally {
      setLoading((prev) => ({ ...prev, [targetUser.uid]: false }));
    }
  };

  // Helper stats count
  const activeEmergencies = emergencies.filter((e) => e.status === "active");
  const deviceLostUsers = users.filter((u) => u.status === "lost");
  const activeTrackerCount = users.filter((u) => u.lastLocation).length;

  // Render filtering for directories
  const queriedUsers = users.filter((user) => {
    const matchesSearch =
      user.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.phone.includes(searchQuery);

    if (filterType === "all") return matchesSearch;
    return matchesSearch && user.status === filterType;
  });

  return (
    <div className="w-full min-h-screen bg-slate-50 flex flex-col font-sans" id="admin-dashboard-container">
      
      {/* Dynamic blinking header alert */}
      {activeEmergencies.length > 0 && (
        <div className="bg-rose-700 text-white font-extrabold text-sm py-2 text-center animate-pulse flex items-center justify-center gap-1.5 z-50 shadow-md">
          <Radio className="w-4.5 h-4.5 animate-ping text-rose-200" />
          <span>ATTENTION COMMAND CENTER: {activeEmergencies.length} ACTIVE NEPAL RAPID RESCUE ALERTS LIVE</span>
        </div>
      )}

      {/* Nav */}
      <header className="sticky top-0 z-40 bg-slate-900 text-white px-6 py-4 flex items-center justify-between shadow-md border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center text-white shadow-xl">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight">
              Khoji<span className="text-red-500">.com</span> <span className="text-xs bg-red-600 px-2 py-0.5 rounded-full uppercase ml-1.5 font-bold tracking-widest text-[#f8fafc]">Nepal Command</span>
            </h1>
            <p className="text-[10px] text-slate-400 font-mono">AUTHORIZED RESCUE LOGISTICS INTERFACE</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <span className="text-xs font-bold text-red-400 uppercase tracking-widest font-mono">SUPER USER</span>
            <p className="text-sm font-semibold text-slate-100">{adminUser.fullName}</p>
          </div>
          <button
            onClick={onLogout}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-200 bg-slate-800 hover:bg-slate-700 hover:text-white transition rounded-lg border border-slate-700"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Stats Counter Row */}
      <div className="bg-white border-b border-slate-200 py-5 px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4 flex items-center gap-4">
            <div className="w-11 h-11 bg-rose-600 text-white rounded-xl flex items-center justify-center shadow">
              <Radio className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <span className="text-2xl font-extrabold text-rose-700">{activeEmergencies.length}</span>
              <p className="text-xs text-rose-500 font-bold uppercase tracking-wide">Active SOS Alerts</p>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 flex items-center gap-4">
            <div className="w-11 h-11 bg-amber-500 text-white rounded-xl flex items-center justify-center shadow">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <span className="text-2xl font-extrabold text-amber-700">{deviceLostUsers.length}</span>
              <p className="text-xs text-amber-600 font-bold uppercase tracking-wide">Device Lost Flags</p>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex items-center gap-4">
            <div className="w-11 h-11 bg-slate-800 text-white rounded-xl flex items-center justify-center shadow">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <span className="text-2xl font-extrabold text-slate-800">{users.length}</span>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-wide">Total Users Registered</p>
            </div>
          </div>

          <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 flex items-center gap-4">
            <div className="w-11 h-11 bg-indigo-600 text-white rounded-xl flex items-center justify-center shadow">
              <MapPin className="w-6 h-6 animate-bounce" />
            </div>
            <div>
              <span className="text-2xl font-extrabold text-indigo-700">{activeTrackerCount}</span>
              <p className="text-xs text-indigo-600 font-bold uppercase tracking-wide">Active GPS Targets</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Layout Grid */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Left Side (Map panel & Logistics info) */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          
          {/* Main Nepal Tracker Map */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex-1 flex flex-col gap-3 min-h-[440px]">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-1.5">
                  <Layers className="text-indigo-600 w-5 h-5" />
                  <span>Interactive Nepal Master Dispatch Grid</span>
                </h2>
                <p className="text-xs text-slate-500">
                  Live location overlays of all Nepalese users. Glowing red targets are active sirens.
                </p>
              </div>

              {/* Status Map Legends */}
              <div className="flex items-center gap-3 text-[11px] font-bold">
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-red-500 rounded-full inline-block" /> SOS</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-amber-500 rounded-full inline-block" /> Lost</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-blue-500 rounded-full inline-block" /> Safe</span>
              </div>
            </div>

            {/* Render the tracking map */}
            <div className="flex-1 min-h-[350px]">
              <TrackingMap
                users={users}
                emergencies={emergencies}
                selectedUser={selectedUser}
                selectedEmergency={selectedEmergency}
              />
            </div>
          </div>

          {/* Commander Logs console */}
          <div className="bg-slate-900 rounded-2xl p-5 border border-slate-800 text-slate-300 font-mono">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
              <span className="text-xs font-bold text-red-500 flex items-center gap-1.5 uppercase">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-ping inline-block" /> 
                System Kernel Stream Logs
              </span>
              <span className="text-[10px] text-slate-500">Live Decryption feeds</span>
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
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4 max-h-[360px] overflow-y-auto">
            <h3 className="text-xs font-bold uppercase tracking-wider text-red-600 flex items-center gap-1.5 border-b pb-2">
              <span className="w-2.5 h-2.5 bg-red-600 rounded-full animate-ping" />
              Active Dispatch Board ({activeEmergencies.length})
            </h3>

            {activeEmergencies.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-400">
                ✔️ No pending SOS dispatch requirements. Excellent safety metrics.
              </div>
            ) : (
              <div className="space-y-4">
                {activeEmergencies.map((alert) => (
                  <div
                    key={alert.id}
                    onClick={() => {
                      setSelectedEmergency(alert);
                      setSelectedUser(null);
                    }}
                    className={`p-3.5 rounded-xl border transition cursor-pointer ${
                      selectedEmergency?.id === alert.id
                        ? "bg-rose-50/60 border-rose-300 ring-1 ring-rose-200"
                        : "bg-slate-50/60 border-slate-200 hover:border-rose-200"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-slate-900">{alert.userName}</span>
                      <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-rose-600 text-white font-mono">
                        {alert.type}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-500 mb-2 font-semibold">📞 Contact: {alert.userPhone}</p>
                    <p className="text-xs text-slate-700 bg-white p-2 rounded-lg border border-slate-100 italic mb-3">
                      "{alert.details || "No secondary notes provided."}"
                    </p>

                    <div className="flex items-center justify-between pt-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          resolveEmergency(alert);
                        }}
                        disabled={loading[alert.id]}
                        className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-[10px] rounded-lg transition disabled:opacity-50 flex items-center gap-1 uppercase"
                      >
                        <CheckSquare className="w-3 h-3" />
                        <span>{loading[alert.id] ? "Resolving..." : "Resolve Incident"}</span>
                      </button>

                      <span className="text-[9px] text-slate-400 font-mono">
                        {new Date(alert.createdAt).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section: USER TRACKING DIRECTORY */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4 flex-1 flex flex-col min-h-[350px]">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5 border-b pb-2">
              <Users className="w-4 h-4 text-slate-500" />
              <span>User GPS directory</span>
            </h3>

            {/* Filters and search box */}
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Query name, phone, email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full text-xs pl-8 pr-3 py-2 border rounded-xl focus:border-indigo-500 outline-none transition"
                />
              </div>

              {/* Status categories filters */}
              <div className="grid grid-cols-4 gap-1">
                {(["all", "emergency", "lost", "normal"] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => setFilterType(type)}
                    className={`text-[9px] font-bold py-1 px-1 border rounded-lg transition text-center uppercase truncate ${
                      filterType === type
                        ? "bg-slate-900 border-slate-900 text-white"
                        : "bg-slate-50 hover:bg-slate-100 text-slate-600"
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {/* Lists area */}
            <div className="space-y-2 flex-1 overflow-y-auto max-h-[200px] xl:max-h-[280px]">
              {queriedUsers.map((user) => (
                <div
                  key={user.uid}
                  onClick={() => {
                    setSelectedUser(user);
                    setSelectedEmergency(null);
                  }}
                  className={`p-3 rounded-xl border transition cursor-pointer flex items-center justify-between ${
                    selectedUser?.uid === user.uid
                      ? "bg-indigo-50/70 border-indigo-300 ring-1 ring-indigo-200"
                      : "bg-slate-50/40 border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div className="space-y-0.5 truncate pr-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-slate-800 block truncate">{user.fullName}</span>
                      <span className={`text-[8px] font-extrabold uppercase px-1 rounded-full border ${
                        user.status === "emergency" ? "bg-red-100 text-red-800 border-red-200 animate-pulse" : user.status === "lost" ? "bg-amber-100 text-amber-800 border-amber-200" : "bg-emerald-100 text-emerald-800 border-emerald-200"
                      }`}>
                        {user.status}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-500 block truncate">📞 {user.phone}</span>
                    <span className="text-[10px] text-slate-400 block font-mono truncate">{user.email}</span>
                  </div>

                  {/* Actions for manual resetting */}
                  <div>
                    {user.status !== "normal" && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          manualResetProfile(user);
                        }}
                        disabled={loading[user.uid]}
                        className="p-1 px-1.5 bg-slate-200 text-slate-700 text-[9px] hover:bg-slate-300 font-bold rounded"
                        title="Manually clear status to safe"
                      >
                        Reset Status
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {queriedUsers.length === 0 && (
                <div className="text-center py-8 text-xs text-slate-400">
                  No matching user metrics discovered in Nepal.
                </div>
              )}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
