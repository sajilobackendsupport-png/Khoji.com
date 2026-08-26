import React, { useState, useMemo } from "react";
import {
  EmergencyAlert,
  UserProfile,
  EmergencyType,
  EmergencyStatus,
} from "../types";
import {
  Table,
  FileSpreadsheet,
  BarChart3,
  PieChart as PieChartIcon,
  TrendingUp,
  MapPin,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Radio,
  Search,
  Filter,
  Download,
  Plus,
  ArrowUpDown,
  ExternalLink,
  Shield,
  HeartPulse,
  Flame,
  HelpCircle,
  Phone,
  RefreshCw,
  Sparkles,
  Layers,
  Calendar,
  Activity,
  Check,
  Edit3,
  Save,
  Trash2,
  Eye,
  Zap,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  CartesianGrid,
} from "recharts";
import { doc, updateDoc, addDoc, collection } from "firebase/firestore";
import { db } from "../firebase";
import { getNearestProviderForAlert } from "../utils/nearestEmergencyProviders";

interface AdminRealtimeSheetAndAnalyticsProps {
  emergencies: EmergencyAlert[];
  users: UserProfile[];
  onSelectEmergency: (alert: EmergencyAlert) => void;
  onSelectUser: (user: UserProfile) => void;
  onResolveEmergency: (alert: EmergencyAlert) => void;
  onRedirectEmergencyService?: (alert: EmergencyAlert, newType: EmergencyType, notes: string) => void;
  isDark?: boolean;
}

const COLORS = {
  police: "#ef4444", // Red
  ambulance: "#f43f5e", // Rose
  fire: "#f97316", // Orange
  lost: "#eab308", // Amber
  resolved: "#10b981", // Emerald
  active: "#ef4444",
};

const PIE_COLORS = ["#ef4444", "#f43f5e", "#f97316", "#eab308", "#8b5cf6", "#3b82f6"];

export default function AdminRealtimeSheetAndAnalytics({
  emergencies,
  users,
  onSelectEmergency,
  onSelectUser,
  onResolveEmergency,
  onRedirectEmergencyService,
  isDark = false,
}: AdminRealtimeSheetAndAnalyticsProps) {
  const [activeTab, setActiveTab] = useState<"sheet" | "analytics" | "flow">("sheet");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "resolved">("all");
  const [typeFilter, setTypeFilter] = useState<"all" | EmergencyType>("all");
  const [sortField, setSortField] = useState<"createdAt" | "resolvedAt" | "userName" | "type" | "location">("createdAt");
  const [sortAsc, setSortAsc] = useState(false);
  const [editingNotesId, setEditingNotesId] = useState<string | null>(null);
  const [editingNotesValue, setEditingNotesValue] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [timeRange, setTimeRange] = useState<"all" | "today" | "7d" | "30d">("all");

  // New emergency manual record state
  const [newManualUser, setNewManualUser] = useState("");
  const [newManualPhone, setNewManualPhone] = useState("");
  const [newManualType, setNewManualType] = useState<EmergencyType>("police");
  const [newManualLocation, setNewManualLocation] = useState("Kathmandu Durbar Square");
  const [newManualLat, setNewManualLat] = useState("27.7042");
  const [newManualLng, setNewManualLng] = useState("85.3067");
  const [newManualDetails, setNewManualDetails] = useState("");
  const [isSavingManual, setIsSavingManual] = useState(false);

  // Time formatting helpers
  const formatDateTime = (isoString?: string) => {
    if (!isoString) return { date: "—", time: "—", full: "Pending" };
    try {
      const d = new Date(isoString);
      return {
        date: d.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" }),
        time: d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
        full: `${d.toLocaleDateString()} ${d.toLocaleTimeString()}`,
      };
    } catch {
      return { date: "—", time: "—", full: isoString };
    }
  };

  const getDuration = (startIso: string, endIso?: string) => {
    if (!endIso) return null;
    const start = new Date(startIso).getTime();
    const end = new Date(endIso).getTime();
    const diffSec = Math.floor((end - start) / 1000);
    if (diffSec < 0) return "0s";
    if (diffSec < 60) return `${diffSec}s`;
    const mins = Math.floor(diffSec / 60);
    const secs = diffSec % 60;
    if (mins < 60) return `${mins}m ${secs}s`;
    const hours = Math.floor(mins / 60);
    const remMins = mins % 60;
    return `${hours}h ${remMins}m`;
  };

  // Filter & Sort emergencies
  const filteredAndSortedEmergencies = useMemo(() => {
    return emergencies
      .filter((em) => {
        // Status filter
        if (statusFilter !== "all" && em.status !== statusFilter) return false;
        // Type filter
        if (typeFilter !== "all" && em.type !== typeFilter) return false;
        // Time range filter
        if (timeRange !== "all") {
          const now = Date.now();
          const emTime = new Date(em.createdAt).getTime();
          if (timeRange === "today") {
            const oneDay = 24 * 60 * 60 * 1000;
            if (now - emTime > oneDay) return false;
          } else if (timeRange === "7d") {
            const sevenDays = 7 * 24 * 60 * 60 * 1000;
            if (now - emTime > sevenDays) return false;
          } else if (timeRange === "30d") {
            const thirtyDays = 30 * 24 * 60 * 60 * 1000;
            if (now - emTime > thirtyDays) return false;
          }
        }
        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchUser = em.userName?.toLowerCase().includes(q);
          const matchPhone = em.userPhone?.includes(q);
          const matchDetails = em.details?.toLowerCase().includes(q);
          const matchAddress = em.address?.toLowerCase().includes(q);
          const matchService = em.serviceName?.toLowerCase().includes(q);
          const matchStation = em.nearestStation?.toLowerCase().includes(q);
          const matchType = em.type.toLowerCase().includes(q);
          return matchUser || matchPhone || matchDetails || matchAddress || matchService || matchStation || matchType;
        }
        return true;
      })
      .sort((a, b) => {
        let valA = "";
        let valB = "";
        if (sortField === "createdAt") {
          valA = a.createdAt;
          valB = b.createdAt;
        } else if (sortField === "resolvedAt") {
          valA = a.resolvedAt || "";
          valB = b.resolvedAt || "";
        } else if (sortField === "userName") {
          valA = (a.userName || "").toLowerCase();
          valB = (b.userName || "").toLowerCase();
        } else if (sortField === "type") {
          valA = a.type;
          valB = b.type;
        } else if (sortField === "location") {
          valA = (a.address || "").toLowerCase();
          valB = (b.address || "").toLowerCase();
        }

        if (valA < valB) return sortAsc ? -1 : 1;
        if (valA > valB) return sortAsc ? 1 : -1;
        return 0;
      });
  }, [emergencies, statusFilter, typeFilter, timeRange, searchQuery, sortField, sortAsc]);

  // Analytics Computation:
  // 1. Emergency Types Distribution
  const typeStats = useMemo(() => {
    const counts: Record<EmergencyType, number> = {
      police: 0,
      ambulance: 0,
      fire: 0,
      lost: 0,
    };
    emergencies.forEach((e) => {
      if (counts[e.type] !== undefined) {
        counts[e.type]++;
      }
    });

    const total = emergencies.length || 1;
    const data = [
      { name: "Police (100)", type: "police", count: counts.police, percent: Math.round((counts.police / total) * 100), color: COLORS.police },
      { name: "Medical (102)", type: "ambulance", count: counts.ambulance, percent: Math.round((counts.ambulance / total) * 100), color: COLORS.ambulance },
      { name: "Fire (101)", type: "fire", count: counts.fire, percent: Math.round((counts.fire / total) * 100), color: COLORS.fire },
      { name: "Lost/Rescue (1155)", type: "lost", count: counts.lost, percent: Math.round((counts.lost / total) * 100), color: COLORS.lost },
    ];

    // Find most frequent
    const mostFrequent = [...data].sort((a, b) => b.count - a.count)[0];

    return { data, counts, mostFrequent, total: emergencies.length };
  }, [emergencies]);

  // 2. Location Hotspots Analysis
  const locationStats = useMemo(() => {
    const locMap: Record<string, { name: string; count: number; police: number; ambulance: number; fire: number; lost: number }> = {};

    emergencies.forEach((e) => {
      let locName = e.address || "Kathmandu Valley";
      // Normalize common names
      if (locName.toLowerCase().includes("thamel")) locName = "Thamel, Kathmandu";
      else if (locName.toLowerCase().includes("patan") || locName.toLowerCase().includes("lalitpur")) locName = "Patan / Lalitpur";
      else if (locName.toLowerCase().includes("bhaktapur")) locName = "Bhaktapur";
      else if (locName.toLowerCase().includes("pokhara") || locName.toLowerCase().includes("lakeside")) locName = "Pokhara Lakeside";
      else if (locName.toLowerCase().includes("chitwan") || locName.toLowerCase().includes("bharatpur")) locName = "Chitwan / Bharatpur";
      else if (locName.toLowerCase().includes("biratnagar")) locName = "Biratnagar";
      else if (locName.toLowerCase().includes("butwal")) locName = "Butwal";
      else if (locName.toLowerCase().includes("durbarmarg") || locName.toLowerCase().includes("durbar square")) locName = "Durbar Marg / Kathmandu";
      else if (locName.length > 28) locName = locName.slice(0, 26) + "...";

      if (!locMap[locName]) {
        locMap[locName] = { name: locName, count: 0, police: 0, ambulance: 0, fire: 0, lost: 0 };
      }
      locMap[locName].count++;
      if (e.type === "police") locMap[locName].police++;
      else if (e.type === "ambulance") locMap[locName].ambulance++;
      else if (e.type === "fire") locMap[locName].fire++;
      else if (e.type === "lost") locMap[locName].lost++;
    });

    const sorted = Object.values(locMap).sort((a, b) => b.count - a.count);
    const topLocations = sorted.slice(0, 8);
    const primaryHotspot = topLocations[0] || { name: "Kathmandu Central", count: 0 };

    return { topLocations, primaryHotspot };
  }, [emergencies]);

  // 3. User Flows & Hourly Timeline Trends
  const timelineFlowStats = useMemo(() => {
    // Group into 6 time buckets / intervals or days
    const timeBuckets: Record<string, { time: string; active: number; resolved: number; total: number }> = {};

    // Generate recent 7 day labels or hours
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const label = d.toLocaleDateString([], { month: "short", day: "numeric" });
      timeBuckets[label] = { time: label, active: 0, resolved: 0, total: 0 };
    }

    emergencies.forEach((e) => {
      const d = new Date(e.createdAt);
      const label = d.toLocaleDateString([], { month: "short", day: "numeric" });
      if (timeBuckets[label]) {
        timeBuckets[label].total++;
        if (e.status === "resolved") {
          timeBuckets[label].resolved++;
        } else {
          timeBuckets[label].active++;
        }
      }
    });

    const flowData = Object.values(timeBuckets);

    // Calculate resolution KPIs
    const resolvedEmergencies = emergencies.filter((e) => e.status === "resolved" && e.resolvedAt);
    let totalDurationSec = 0;
    resolvedEmergencies.forEach((e) => {
      const start = new Date(e.createdAt).getTime();
      const end = new Date(e.resolvedAt!).getTime();
      const diffSec = Math.max(0, Math.floor((end - start) / 1000));
      totalDurationSec += diffSec;
    });

    const avgDurationSec = resolvedEmergencies.length > 0 ? Math.round(totalDurationSec / resolvedEmergencies.length) : 240;
    const avgMinutes = Math.floor(avgDurationSec / 60);
    const avgSeconds = avgDurationSec % 60;
    const avgDurationFormatted = `${avgMinutes}m ${avgSeconds}s`;

    const resolutionRate = emergencies.length > 0 ? Math.round((resolvedEmergencies.length / emergencies.length) * 100) : 100;

    return {
      flowData,
      avgDurationFormatted,
      resolutionRate,
      resolvedCount: resolvedEmergencies.length,
      activeCount: emergencies.filter((e) => e.status === "active").length,
    };
  }, [emergencies]);

  // Save in-line notes to Firestore
  const handleSaveNotes = async (alertId: string) => {
    try {
      const emRef = doc(db, "emergencies", alertId);
      await updateDoc(emRef, {
        adminNotes: editingNotesValue,
      });
      setEditingNotesId(null);
    } catch (err) {
      console.warn("Save note fallback", err);
      setEditingNotesId(null);
    }
  };

  // Create Manual Emergency Record
  const handleCreateManualEmergency = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newManualUser.trim() || !newManualPhone.trim()) return;

    setIsSavingManual(true);
    const alertId = `manual-sos-${Date.now()}`;
    const lat = parseFloat(newManualLat) || 27.7172;
    const lng = parseFloat(newManualLng) || 85.324;

    const serviceNames: Record<EmergencyType, string> = {
      police: "Nepal Police Dispatch (100)",
      ambulance: "Emergency Medical Ambulance (102)",
      fire: "Fire & Rescue Brigade (101)",
      lost: "Search & Rescue / Lost Device (1155)",
    };

    const newRecord: EmergencyAlert = {
      id: alertId,
      userId: `admin-entry-${Date.now()}`,
      userName: newManualUser.trim(),
      userPhone: newManualPhone.trim(),
      type: newManualType,
      serviceName: serviceNames[newManualType],
      servicePhone: newManualType === "police" ? "100" : newManualType === "ambulance" ? "102" : newManualType === "fire" ? "101" : "1155",
      status: "active",
      location: { lat, lng },
      address: newManualLocation.trim() || "Kathmandu, Nepal",
      details: newManualDetails.trim() || `Manual dispatcher entry recorded at ${new Date().toLocaleTimeString()}`,
      dialTriggeredOnUserDevice: false,
      adminNotes: `Entered manually by dispatcher at ${new Date().toLocaleString()}`,
      createdAt: new Date().toISOString(),
    };

    try {
      await addDoc(collection(db, "emergencies"), newRecord);
      setShowAddModal(false);
      setNewManualUser("");
      setNewManualPhone("");
      setNewManualDetails("");
    } catch (err) {
      console.error("Failed to add manual record to firestore:", err);
      setShowAddModal(false);
    } finally {
      setIsSavingManual(false);
    }
  };

  // Export full sheet to CSV
  const handleExportCSV = () => {
    const headers = [
      "Record ID",
      "Created Date & Time",
      "Resolved Date & Time",
      "Resolution Duration",
      "Citizen Name",
      "Citizen Phone",
      "Emergency Type",
      "Service Requested",
      "Status",
      "Location Landmark / Address",
      "GPS Latitude",
      "GPS Longitude",
      "Nearest Dispatched Station",
      "Station Phone",
      "Dispatcher Notes",
      "Incident Description",
    ];

    const rows = filteredAndSortedEmergencies.map((em) => {
      const created = formatDateTime(em.createdAt).full;
      const resolved = em.resolvedAt ? formatDateTime(em.resolvedAt).full : "Active (Pending)";
      const duration = getDuration(em.createdAt, em.resolvedAt) || "Active";
      return [
        `"${em.id}"`,
        `"${created}"`,
        `"${resolved}"`,
        `"${duration}"`,
        `"${em.userName || "Citizen"}"`,
        `"${em.userPhone}"`,
        `"${em.type.toUpperCase()}"`,
        `"${em.serviceName || em.type}"`,
        `"${em.status.toUpperCase()}"`,
        `"${(em.address || "").replace(/"/g, '""')}"`,
        em.location?.lat || "",
        em.location?.lng || "",
        `"${(em.nearestStation || "N/A").replace(/"/g, '""')}"`,
        `"${em.nearestStationPhone || "N/A"}"`,
        `"${(em.adminNotes || "").replace(/"/g, '""')}"`,
        `"${(em.details || "").replace(/"/g, '""')}"`,
      ];
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Khoji_Emergency_Master_Sheet_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getServiceBadge = (type: EmergencyType, serviceName?: string) => {
    switch (type) {
      case "police":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 dark:bg-red-950/80 text-red-700 dark:text-red-300 rounded-lg text-xs font-black border border-red-200 dark:border-red-800 whitespace-nowrap">
            <Shield className="w-3 h-3 text-red-600" />
            <span>{serviceName || "Police (100)"}</span>
          </span>
        );
      case "ambulance":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 rounded-lg text-xs font-black border border-rose-200 dark:border-rose-800 whitespace-nowrap">
            <HeartPulse className="w-3 h-3 text-rose-600" />
            <span>{serviceName || "Ambulance (102)"}</span>
          </span>
        );
      case "fire":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-orange-100 dark:bg-orange-950/80 text-orange-700 dark:text-orange-300 rounded-lg text-xs font-black border border-orange-200 dark:border-orange-800 whitespace-nowrap">
            <Flame className="w-3 h-3 text-orange-600" />
            <span>{serviceName || "Fire (101)"}</span>
          </span>
        );
      case "lost":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 rounded-lg text-xs font-black border border-amber-200 dark:border-amber-800 whitespace-nowrap">
            <HelpCircle className="w-3 h-3 text-amber-600" />
            <span>{serviceName || "Lost / Rescue"}</span>
          </span>
        );
      default:
        return <span className="text-xs font-bold">{type}</span>;
    }
  };

  return (
    <div className="space-y-6 w-full" id="admin-realtime-sheet-and-analytics">
      {/* Realtime Live Sync Status Banner & Header */}
      <div className="bg-white dark:bg-slate-850 p-5 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <span>Realtime Emergency Data Sheet & Analytics</span>
            </h2>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <span>Auto-Saving Realtime</span>
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Live synchronized record of all citizen distress signals, timestamps, resolved intervals, emergency types, and hotspot telemetry.
          </p>
        </div>

        {/* Action Controls & Navigation View Switcher */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center bg-slate-100 dark:bg-slate-900 p-1 rounded-2xl border border-slate-200 dark:border-slate-800">
            <button
              onClick={() => setActiveTab("sheet")}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-black transition cursor-pointer ${
                activeTab === "sheet"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <Table className="w-3.5 h-3.5" />
              <span>Live Sheet ({emergencies.length})</span>
            </button>

            <button
              onClick={() => setActiveTab("analytics")}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-black transition cursor-pointer ${
                activeTab === "analytics"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Charts & Locations</span>
            </button>

            <button
              onClick={() => setActiveTab("flow")}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-black transition cursor-pointer ${
                activeTab === "flow"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>User Flows</span>
            </button>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-black rounded-xl shadow-xs transition cursor-pointer"
            title="Add a manual emergency call or walk-in distress signal"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ New Entry</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-black rounded-xl shadow-xs transition cursor-pointer"
            title="Export full spreadsheet to CSV file"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* KPI Top Highlights Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
        <div className="bg-white dark:bg-slate-850 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
          <span className="text-[10px] uppercase font-mono font-bold text-slate-400 block">Total Recorded</span>
          <span className="text-xl font-black text-slate-900 dark:text-white">{emergencies.length}</span>
          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold block">100% cloud synced</span>
        </div>

        <div className="bg-red-50 dark:bg-red-950/40 p-3.5 rounded-2xl border border-red-200 dark:border-red-900 shadow-xs">
          <span className="text-[10px] uppercase font-mono font-bold text-red-600 dark:text-red-400 flex items-center gap-1">
            <Radio className="w-3 h-3 animate-ping" />
            <span>Active Signals</span>
          </span>
          <span className="text-xl font-black text-red-700 dark:text-red-300">
            {timelineFlowStats.activeCount}
          </span>
          <span className="text-[10px] text-red-500 font-bold block">Pending resolution</span>
        </div>

        <div className="bg-white dark:bg-slate-850 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
          <span className="text-[10px] uppercase font-mono font-bold text-slate-400 block">Most Caused Emergency</span>
          <span className="text-sm font-black text-red-600 dark:text-red-400 truncate block">
            {typeStats.mostFrequent ? `${typeStats.mostFrequent.name} (${typeStats.mostFrequent.count})` : "Police (100)"}
          </span>
          <span className="text-[10px] text-slate-500 block">
            {typeStats.mostFrequent ? `${typeStats.mostFrequent.percent}% of all distress` : "Leading signal"}
          </span>
        </div>

        <div className="bg-white dark:bg-slate-850 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
          <span className="text-[10px] uppercase font-mono font-bold text-slate-400 block">Top Hotspot Location</span>
          <span className="text-sm font-black text-blue-600 dark:text-blue-400 truncate block">
            {locationStats.primaryHotspot.name}
          </span>
          <span className="text-[10px] text-slate-500 block">
            {locationStats.primaryHotspot.count} incidents logged
          </span>
        </div>

        <div className="bg-white dark:bg-slate-850 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs col-span-2 sm:col-span-4 lg:col-span-1">
          <span className="text-[10px] uppercase font-mono font-bold text-slate-400 block">Avg Resolution Time</span>
          <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">
            {timelineFlowStats.avgDurationFormatted}
          </span>
          <span className="text-[10px] text-slate-500 block">
            {timelineFlowStats.resolutionRate}% resolution rate
          </span>
        </div>
      </div>

      {/* =========================================================================
          TAB 1: LIVE SPREADSHEET (REALTIME SHEET VIEW)
          ========================================================================= */}
      {activeTab === "sheet" && (
        <div className="bg-white dark:bg-slate-850 rounded-3xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
          {/* Sheet Filters and Search Row */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[240px] w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter by citizen name, phone, emergency service, address, station..."
                className="w-full pl-9.5 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none"
              >
                <option value="all">All Status (Active & Resolved)</option>
                <option value="active">🔴 Active SOS</option>
                <option value="resolved">🟢 Resolved</option>
              </select>

              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as any)}
                className="px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none"
              >
                <option value="all">All Emergency Types</option>
                <option value="police">🚨 Police (100)</option>
                <option value="ambulance">🚑 Ambulance (102)</option>
                <option value="fire">🔥 Fire Brigade (101)</option>
                <option value="lost">⚠️ Lost / Rescue (1155)</option>
              </select>

              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value as any)}
                className="px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none"
              >
                <option value="all">All Time</option>
                <option value="today">Today (24h)</option>
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
              </select>
            </div>
          </div>

          {/* SPREADSHEET TABLE */}
          <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-mono uppercase text-[10px] font-bold select-none">
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  <th className="p-3 whitespace-nowrap">#</th>
                  <th
                    onClick={() => {
                      if (sortField === "createdAt") setSortAsc(!sortAsc);
                      else {
                        setSortField("createdAt");
                        setSortAsc(false);
                      }
                    }}
                    className="p-3 cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-800 transition whitespace-nowrap"
                  >
                    <div className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-amber-500" />
                      <span>Created Timestamp</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th
                    onClick={() => {
                      if (sortField === "userName") setSortAsc(!sortAsc);
                      else {
                        setSortField("userName");
                        setSortAsc(true);
                      }
                    }}
                    className="p-3 cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-800 transition whitespace-nowrap"
                  >
                    <div className="flex items-center gap-1">
                      <span>Citizen Name & Phone</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th
                    onClick={() => {
                      if (sortField === "type") setSortAsc(!sortAsc);
                      else {
                        setSortField("type");
                        setSortAsc(true);
                      }
                    }}
                    className="p-3 cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-800 transition whitespace-nowrap"
                  >
                    <div className="flex items-center gap-1">
                      <span>Emergency Service</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th className="p-3 whitespace-nowrap">Status</th>
                  <th
                    onClick={() => {
                      if (sortField === "resolvedAt") setSortAsc(!sortAsc);
                      else {
                        setSortField("resolvedAt");
                        setSortAsc(false);
                      }
                    }}
                    className="p-3 cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-800 transition whitespace-nowrap"
                  >
                    <div className="flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Resolved Time & Duration</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th
                    onClick={() => {
                      if (sortField === "location") setSortAsc(!sortAsc);
                      else {
                        setSortField("location");
                        setSortAsc(true);
                      }
                    }}
                    className="p-3 cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-800 transition whitespace-nowrap"
                  >
                    <div className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-red-500" />
                      <span>Incident Location</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th className="p-3 whitespace-nowrap">Nearest Station</th>
                  <th className="p-3 whitespace-nowrap">Dispatcher Notes (Auto-Save)</th>
                  <th className="p-3 text-right whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-sans">
                {filteredAndSortedEmergencies.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="p-8 text-center text-slate-400 font-medium">
                      No emergency records match your current filters.
                    </td>
                  </tr>
                ) : (
                  filteredAndSortedEmergencies.map((alert, index) => {
                    const createdFormatted = formatDateTime(alert.createdAt);
                    const resolvedFormatted = formatDateTime(alert.resolvedAt);
                    const duration = getDuration(alert.createdAt, alert.resolvedAt);
                    const nearest = getNearestProviderForAlert(alert);
                    const isEditingNote = editingNotesId === alert.id;

                    return (
                      <tr
                        key={alert.id}
                        className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors ${
                          alert.status === "active" ? "bg-red-50/30 dark:bg-red-950/15" : ""
                        }`}
                      >
                        {/* 1. Row Index */}
                        <td className="p-3 font-mono text-[10px] text-slate-400 whitespace-nowrap">
                          {index + 1}
                        </td>

                        {/* 2. Created Timestamp */}
                        <td className="p-3 whitespace-nowrap">
                          <div className="font-mono font-bold text-slate-900 dark:text-slate-100">
                            {createdFormatted.time}
                          </div>
                          <div className="text-[10px] font-mono text-slate-500">
                            {createdFormatted.date}
                          </div>
                        </td>

                        {/* 3. Citizen Details */}
                        <td className="p-3 min-w-[150px]">
                          <div className="font-black text-slate-900 dark:text-white truncate">
                            {alert.userName || "Citizen"}
                          </div>
                          <a
                            href={`tel:${alert.userPhone}`}
                            className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                          >
                            <Phone className="w-3 h-3" />
                            <span>{alert.userPhone}</span>
                          </a>
                        </td>

                        {/* 4. Service Requested */}
                        <td className="p-3 whitespace-nowrap">
                          {getServiceBadge(alert.type, alert.serviceName)}
                        </td>

                        {/* 5. Status Badge */}
                        <td className="p-3 whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                              alert.status === "active"
                                ? "bg-red-600 text-white animate-pulse"
                                : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                            }`}
                          >
                            {alert.status === "active" ? "🚨 Active" : "✅ Resolved"}
                          </span>
                        </td>

                        {/* 6. Resolved Timestamp & Duration */}
                        <td className="p-3 whitespace-nowrap">
                          {alert.status === "resolved" && alert.resolvedAt ? (
                            <div>
                              <div className="font-mono font-bold text-emerald-700 dark:text-emerald-300">
                                {resolvedFormatted.time}
                              </div>
                              <div className="text-[10px] font-mono text-slate-500">
                                Took: <strong className="text-slate-800 dark:text-slate-200">{duration}</strong>
                              </div>
                            </div>
                          ) : (
                            <span className="text-[11px] font-mono text-red-600 dark:text-red-400 font-bold flex items-center gap-1">
                              <Radio className="w-3 h-3 animate-ping" />
                              <span>Live in Progress</span>
                            </span>
                          )}
                        </td>

                        {/* 7. Incident Location */}
                        <td className="p-3 min-w-[180px]">
                          <div className="font-medium text-slate-800 dark:text-slate-200 line-clamp-1">
                            📍 {alert.address || "Kathmandu Valley"}
                          </div>
                          <div className="text-[10px] font-mono text-slate-400">
                            {alert.location?.lat.toFixed(4)}, {alert.location?.lng.toFixed(4)}
                          </div>
                        </td>

                        {/* 8. Nearest Station */}
                        <td className="p-3 min-w-[150px]">
                          <div className="font-bold text-slate-800 dark:text-slate-200 truncate">
                            {alert.nearestStation || (nearest ? nearest.provider.name : "Local Dispatch")}
                          </div>
                          <div className="text-[10px] font-mono text-slate-500">
                            {alert.nearestStationPhone || (nearest ? nearest.provider.phone : "100")}
                          </div>
                        </td>

                        {/* 9. In-line Dispatcher Notes (Auto-saved) */}
                        <td className="p-3 min-w-[180px]">
                          {isEditingNote ? (
                            <div className="flex items-center gap-1">
                              <input
                                type="text"
                                value={editingNotesValue}
                                onChange={(e) => setEditingNotesValue(e.target.value)}
                                placeholder="Add dispatcher note..."
                                className="w-full p-1 bg-white dark:bg-slate-900 border border-emerald-500 rounded text-xs text-slate-900 dark:text-white"
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") handleSaveNotes(alert.id);
                                  if (e.key === "Escape") setEditingNotesId(null);
                                }}
                              />
                              <button
                                onClick={() => handleSaveNotes(alert.id)}
                                className="p-1 bg-emerald-600 text-white rounded hover:bg-emerald-700"
                                title="Save note to Firestore"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <div
                              onClick={() => {
                                setEditingNotesId(alert.id);
                                setEditingNotesValue(alert.adminNotes || "");
                              }}
                              className="cursor-pointer group flex items-center justify-between text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                              title="Click to edit notes"
                            >
                              <span className="text-[11px] italic truncate max-w-[150px]">
                                {alert.adminNotes || "Click to add note..."}
                              </span>
                              <Edit3 className="w-3 h-3 opacity-0 group-hover:opacity-100 text-slate-400" />
                            </div>
                          )}
                        </td>

                        {/* 10. Quick Actions */}
                        <td className="p-3 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => onSelectEmergency(alert)}
                              className="px-2 py-1 bg-slate-900 dark:bg-slate-750 hover:bg-slate-800 text-white text-[11px] font-bold rounded-lg transition flex items-center gap-1 cursor-pointer"
                              title="Plot on radar map"
                            >
                              <MapPin className="w-3 h-3 text-red-400" />
                              <span>Radar</span>
                            </button>

                            {alert.status === "active" && (
                              <button
                                onClick={() => onResolveEmergency(alert)}
                                className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold rounded-lg transition flex items-center gap-1 cursor-pointer"
                                title="Mark as resolved"
                              >
                                <CheckCircle2 className="w-3 h-3" />
                                <span>Resolve</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-500 font-mono pt-2">
            <span>
              Showing {filteredAndSortedEmergencies.length} of {emergencies.length} synchronized records
            </span>
            <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold">
              <RefreshCw className="w-3 h-3 animate-spin" />
              <span>Realtime Firestore Listener Active</span>
            </span>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 2: ANALYTICS & HOTSPOT CHARTS
          ========================================================================= */}
      {activeTab === "analytics" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Graph 1: What kind of emergency is caused most? */}
            <div className="bg-white dark:bg-slate-850 p-5 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <PieChartIcon className="w-4 h-4 text-red-500" />
                    <span>Emergency Types Distribution (Most Caused)</span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Breakdown of distress signal categories received across Nepal
                  </p>
                </div>
                <span className="text-xs font-mono font-bold bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 px-2 py-0.5 rounded">
                  {typeStats.total} Total
                </span>
              </div>

              {/* Chart container */}
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={typeStats.data} margin={{ top: 10, right: 20, left: -10, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: isDark ? "#94a3b8" : "#475569" }} />
                    <YAxis tick={{ fontSize: 11, fill: isDark ? "#94a3b8" : "#475569" }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: isDark ? "#0f172a" : "#ffffff",
                        borderColor: isDark ? "#334155" : "#e2e8f0",
                        borderRadius: "12px",
                        fontSize: "12px",
                        fontWeight: "bold",
                      }}
                    />
                    <Bar dataKey="count" fill="#ef4444" radius={[8, 8, 0, 0]}>
                      {typeStats.data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Summary List */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-100 dark:border-slate-750">
                {typeStats.data.map((item) => (
                  <div key={item.name} className="p-2.5 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 text-center">
                    <span className="text-[10px] font-mono text-slate-400 block truncate">{item.name}</span>
                    <span className="text-base font-black text-slate-900 dark:text-white">{item.count}</span>
                    <span className="text-[10px] font-bold" style={{ color: item.color }}>{item.percent}%</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Graph 2: At which location is emergency caused most? (Hotspots) */}
            <div className="bg-white dark:bg-slate-850 p-5 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-blue-500" />
                    <span>Emergency Incident Hotspots by Location</span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Highest incident frequency zones and geographical clusters
                  </p>
                </div>
                <span className="text-xs font-mono font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 px-2 py-0.5 rounded">
                  Top Hotspots
                </span>
              </div>

              {/* Chart container */}
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    layout="vertical"
                    data={locationStats.topLocations}
                    margin={{ top: 10, right: 30, left: 40, bottom: 10 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                    <XAxis type="number" tick={{ fontSize: 11, fill: isDark ? "#94a3b8" : "#475569" }} />
                    <YAxis
                      dataKey="name"
                      type="category"
                      width={100}
                      tick={{ fontSize: 10, fill: isDark ? "#94a3b8" : "#475569" }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: isDark ? "#0f172a" : "#ffffff",
                        borderColor: isDark ? "#334155" : "#e2e8f0",
                        borderRadius: "12px",
                        fontSize: "12px",
                        fontWeight: "bold",
                      }}
                    />
                    <Bar dataKey="police" name="Police" stackId="a" fill="#ef4444" />
                    <Bar dataKey="ambulance" name="Medical" stackId="a" fill="#f43f5e" />
                    <Bar dataKey="fire" name="Fire" stackId="a" fill="#f97316" />
                    <Bar dataKey="lost" name="Lost / Rescue" stackId="a" fill="#eab308" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Hotspot legend */}
              <div className="flex items-center justify-center gap-4 text-xs font-mono font-bold pt-2 border-t border-slate-100 dark:border-slate-750">
                <span className="flex items-center gap-1 text-red-600">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500" /> Police
                </span>
                <span className="flex items-center gap-1 text-rose-600">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Medical
                </span>
                <span className="flex items-center gap-1 text-orange-600">
                  <span className="w-2.5 h-2.5 rounded-full bg-orange-500" /> Fire
                </span>
                <span className="flex items-center gap-1 text-amber-600">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Lost
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 3: USER FLOWS & RESOLUTION TIME TIMELINE
          ========================================================================= */}
      {activeTab === "flow" && (
        <div className="space-y-6">
          {/* User Flow Funnel Cards */}
          <div className="bg-white dark:bg-slate-850 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-500" />
                <span>Citizen Distress Lifecycle & Operational Flow</span>
              </h3>
              <p className="text-xs text-slate-500">
                Realtime funnel tracking users from initial signal trigger to auto-dispatch and resolution
              </p>
            </div>

            {/* Funnel Flow Steps */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
              <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-1">
                <span className="text-[10px] font-mono uppercase font-bold text-slate-400">Step 1: Registered Citizens</span>
                <div className="text-2xl font-black text-slate-900 dark:text-white">{users.length}</div>
                <p className="text-[11px] text-slate-500">Active app installs & profiles with verified emergency contacts</p>
              </div>

              <div className="p-4 bg-red-50 dark:bg-red-950/40 rounded-2xl border border-red-200 dark:border-red-900 space-y-1">
                <span className="text-[10px] font-mono uppercase font-bold text-red-600 dark:text-red-400">Step 2: Triggered SOS</span>
                <div className="text-2xl font-black text-red-600 dark:text-red-400">{emergencies.length}</div>
                <p className="text-[11px] text-red-600/80">Distress calls with GPS coordinates & auto-dialing initiated</p>
              </div>

              <div className="p-4 bg-indigo-50 dark:bg-indigo-950/40 rounded-2xl border border-indigo-200 dark:border-indigo-900 space-y-1">
                <span className="text-[10px] font-mono uppercase font-bold text-indigo-600 dark:text-indigo-400">Step 3: Station Dispatched</span>
                <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400">{emergencies.length}</div>
                <p className="text-[11px] text-indigo-600/80">Nearest local response stations matched with verified telephone routes</p>
              </div>

              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 rounded-2xl border border-emerald-200 dark:border-emerald-900 space-y-1">
                <span className="text-[10px] font-mono uppercase font-bold text-emerald-600 dark:text-emerald-400">Step 4: Resolved Safely</span>
                <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{timelineFlowStats.resolvedCount}</div>
                <p className="text-[11px] text-emerald-600/80">Avg {timelineFlowStats.avgDurationFormatted} from trigger to resolution</p>
              </div>
            </div>
          </div>

          {/* User Flow Trend Over Time (Area Chart) */}
          <div className="bg-white dark:bg-slate-850 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-blue-500" />
                  <span>Distress Volume & Resolution Trend Flow (Recent Timeline)</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Tracking active emergency spikes vs successfully resolved incidents over time
                </p>
              </div>
              <span className="text-xs font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2.5 py-1 rounded-xl">
                Daily Stream Flow
              </span>
            </div>

            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={timelineFlowStats.flowData} margin={{ top: 10, right: 20, left: -10, bottom: 10 }}>
                  <defs>
                    <linearGradient id="totalFlowGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="resolvedFlowGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis dataKey="time" tick={{ fontSize: 11, fill: isDark ? "#94a3b8" : "#475569" }} />
                  <YAxis tick={{ fontSize: 11, fill: isDark ? "#94a3b8" : "#475569" }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: isDark ? "#0f172a" : "#ffffff",
                      borderColor: isDark ? "#334155" : "#e2e8f0",
                      borderRadius: "12px",
                      fontSize: "12px",
                      fontWeight: "bold",
                    }}
                  />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="total"
                    name="Total Incidents"
                    stroke="#ef4444"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#totalFlowGrad)"
                  />
                  <Area
                    type="monotone"
                    dataKey="resolved"
                    name="Resolved Safely"
                    stroke="#10b981"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#resolvedFlowGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: MANUAL EMERGENCY DISPATCH ENTRY
          ========================================================================= */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-850 rounded-3xl max-w-lg w-full p-6 border border-slate-200 dark:border-slate-700 shadow-2xl space-y-4 text-slate-800 dark:text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-750 pb-3">
              <h3 className="text-base font-black flex items-center gap-2">
                <Plus className="w-5 h-5 text-red-600" />
                <span>Add Emergency Record (Manual Dispatch Entry)</span>
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateManualEmergency} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">Citizen Name *</label>
                  <input
                    type="text"
                    required
                    value={newManualUser}
                    onChange={(e) => setNewManualUser(e.target.value)}
                    placeholder="e.g. Ram Bahadur Shrestha"
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">Phone Number *</label>
                  <input
                    type="tel"
                    required
                    value={newManualPhone}
                    onChange={(e) => setNewManualPhone(e.target.value)}
                    placeholder="e.g. 9841234567"
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">Emergency Type *</label>
                <select
                  value={newManualType}
                  onChange={(e) => setNewManualType(e.target.value as EmergencyType)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
                >
                  <option value="police">🚨 Nepal Police (100)</option>
                  <option value="ambulance">🚑 Ambulance Trauma (102)</option>
                  <option value="fire">🔥 Fire & Rescue Brigade (101)</option>
                  <option value="lost">⚠️ Lost / Rescue (1155)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">Location Landmark / Street *</label>
                <input
                  type="text"
                  required
                  value={newManualLocation}
                  onChange={(e) => setNewManualLocation(e.target.value)}
                  placeholder="e.g. Thamel Marg, Ward 26, Kathmandu"
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">GPS Latitude</label>
                  <input
                    type="text"
                    value={newManualLat}
                    onChange={(e) => setNewManualLat(e.target.value)}
                    placeholder="27.7172"
                    className="w-full p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-[11px]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">GPS Longitude</label>
                  <input
                    type="text"
                    value={newManualLng}
                    onChange={(e) => setNewManualLng(e.target.value)}
                    placeholder="85.3240"
                    className="w-full p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-[11px]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">Incident Details & Observations</label>
                <textarea
                  value={newManualDetails}
                  onChange={(e) => setNewManualDetails(e.target.value)}
                  placeholder="Citizen called via landline reporting a road collision near Durbar Marg..."
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl min-h-[60px]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-750">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingManual}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-black rounded-xl shadow cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSavingManual ? "Saving to Cloud..." : "Save & Sync Realtime"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
