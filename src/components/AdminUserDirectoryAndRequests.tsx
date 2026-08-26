import React, { useState, useMemo } from "react";
import { UserProfile, EmergencyAlert, EmergencyType, EmergencyStatus } from "../types";
import {
  Users,
  Clock,
  Phone,
  MapPin,
  Shield,
  AlertTriangle,
  Radio,
  CheckCircle2,
  Search,
  Filter,
  Download,
  Building2,
  HeartPulse,
  Flame,
  HelpCircle,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  UserCheck,
  Smartphone,
  Calendar,
  Layers,
  FileSpreadsheet,
  AlertOctagon,
  ArrowRightLeft,
} from "lucide-react";
import {
  getNearestProviderForAlert,
  findNearestEmergencyProviders,
} from "../utils/nearestEmergencyProviders";

interface AdminUserDirectoryAndRequestsProps {
  users: UserProfile[];
  emergencies: EmergencyAlert[];
  onSelectEmergency: (alert: EmergencyAlert) => void;
  onSelectUser: (user: UserProfile) => void;
  onResolveEmergency: (alert: EmergencyAlert) => void;
  onRedirectEmergencyService?: (alert: EmergencyAlert, newType: EmergencyType, notes: string) => void;
  onResetUserStatus: (user: UserProfile) => void;
  isDark?: boolean;
}

export default function AdminUserDirectoryAndRequests({
  users,
  emergencies,
  onSelectEmergency,
  onSelectUser,
  onResolveEmergency,
  onRedirectEmergencyService,
  onResetUserStatus,
  isDark = false,
}: AdminUserDirectoryAndRequestsProps) {
  const [subTab, setSubTab] = useState<"requests" | "citizens">("requests");
  const [searchQuery, setSearchQuery] = useState("");
  const [serviceFilter, setServiceFilter] = useState<"all" | EmergencyType>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "resolved">("all");
  const [selectedRequestForRedirect, setSelectedRequestForRedirect] = useState<EmergencyAlert | null>(null);
  const [newRedirectType, setNewRedirectType] = useState<EmergencyType>("police");
  const [redirectNotes, setRedirectNotes] = useState("");

  // Filtered emergency requests
  const filteredRequests = useMemo(() => {
    return emergencies.filter((em) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        em.userName?.toLowerCase().includes(q) ||
        em.userPhone?.includes(q) ||
        em.details?.toLowerCase().includes(q) ||
        em.address?.toLowerCase().includes(q) ||
        em.serviceName?.toLowerCase().includes(q) ||
        em.nearestStation?.toLowerCase().includes(q) ||
        em.type?.toLowerCase().includes(q);

      const matchesService = serviceFilter === "all" || em.type === serviceFilter;
      const matchesStatus = statusFilter === "all" || em.status === statusFilter;

      return matchesSearch && matchesService && matchesStatus;
    });
  }, [emergencies, searchQuery, serviceFilter, statusFilter]);

  // Filtered users list
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const q = searchQuery.toLowerCase();
      return (
        u.fullName?.toLowerCase().includes(q) ||
        u.phone?.includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.address?.toLowerCase().includes(q) ||
        u.emergencyContactName?.toLowerCase().includes(q) ||
        u.emergencyContactPhone?.includes(q) ||
        u.bloodGroup?.toLowerCase().includes(q)
      );
    });
  }, [users, searchQuery]);

  // Statistics
  const totalRequests = emergencies.length;
  const activeRequests = emergencies.filter((e) => e.status === "active").length;
  const resolvedRequests = emergencies.filter((e) => e.status === "resolved").length;
  const policeCount = emergencies.filter((e) => e.type === "police").length;
  const ambulanceCount = emergencies.filter((e) => e.type === "ambulance").length;
  const fireCount = emergencies.filter((e) => e.type === "fire").length;
  const lostCount = emergencies.filter((e) => e.type === "lost").length;

  // Export CSV of emergency requests
  const handleExportCSV = () => {
    const headers = [
      "ID",
      "Exact Date & Time (Created)",
      "Citizen Name",
      "Citizen Phone",
      "Service Requested",
      "Status",
      "Nearest Station Dispatched",
      "Station Phone",
      "GPS Latitude",
      "GPS Longitude",
      "Address / Landmark",
      "Incident Details",
      "Resolved At",
    ];

    const rows = filteredRequests.map((r) => [
      `"${r.id}"`,
      `"${new Date(r.createdAt).toLocaleString()}"`,
      `"${r.userName || "Citizen"}"`,
      `"${r.userPhone}"`,
      `"${r.serviceName || r.type.toUpperCase()}"`,
      `"${r.status.toUpperCase()}"`,
      `"${r.nearestStation || "N/A"}"`,
      `"${r.nearestStationPhone || "N/A"}"`,
      r.location?.lat || "",
      r.location?.lng || "",
      `"${(r.address || "").replace(/"/g, '""')}"`,
      `"${(r.details || "").replace(/"/g, '""')}"`,
      `"${r.resolvedAt ? new Date(r.resolvedAt).toLocaleString() : "Active"}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Khoji_Emergency_Service_Requests_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getServiceBadge = (type: EmergencyType, serviceName?: string) => {
    switch (type) {
      case "police":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-100 dark:bg-red-950/80 text-red-700 dark:text-red-300 rounded-lg text-xs font-black border border-red-200 dark:border-red-800">
            <Shield className="w-3.5 h-3.5 text-red-600" />
            <span>{serviceName || "Nepal Police (100)"}</span>
          </span>
        );
      case "ambulance":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 rounded-lg text-xs font-black border border-rose-200 dark:border-rose-800">
            <HeartPulse className="w-3.5 h-3.5 text-rose-600" />
            <span>{serviceName || "Medical Ambulance (102)"}</span>
          </span>
        );
      case "fire":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-orange-100 dark:bg-orange-950/80 text-orange-700 dark:text-orange-300 rounded-lg text-xs font-black border border-orange-200 dark:border-orange-800">
            <Flame className="w-3.5 h-3.5 text-orange-600" />
            <span>{serviceName || "Fire Brigade (101)"}</span>
          </span>
        );
      case "lost":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-lg text-xs font-black border border-slate-300 dark:border-slate-700">
            <HelpCircle className="w-3.5 h-3.5 text-amber-500" />
            <span>{serviceName || "Search & Rescue / Lost"}</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 text-gray-800 rounded-lg text-xs font-bold">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Emergency SOS</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 w-full" id="admin-user-directory-and-requests">
      {/* Top Level Metric Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white dark:bg-slate-800 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <span className="text-[10px] uppercase font-mono font-bold text-slate-400 block">Total Requests</span>
          <span className="text-xl font-black text-slate-900 dark:text-white">{totalRequests}</span>
          <span className="text-[10px] text-slate-500 block">All recorded</span>
        </div>

        <div className="bg-red-50 dark:bg-red-950/50 p-3.5 rounded-2xl border border-red-200 dark:border-red-900 shadow-sm">
          <span className="text-[10px] uppercase font-mono font-bold text-red-600 dark:text-red-400 block flex items-center gap-1">
            <Radio className="w-3 h-3 animate-ping" />
            <span>Active SOS</span>
          </span>
          <span className="text-xl font-black text-red-700 dark:text-red-300">{activeRequests}</span>
          <span className="text-[10px] text-red-600/80 block">Requires attention</span>
        </div>

        <div className="bg-white dark:bg-slate-800 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <span className="text-[10px] uppercase font-mono font-bold text-red-500 block">Police (100)</span>
          <span className="text-xl font-black text-slate-900 dark:text-white">{policeCount}</span>
          <span className="text-[10px] text-slate-500 block">Dispatches</span>
        </div>

        <div className="bg-white dark:bg-slate-800 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <span className="text-[10px] uppercase font-mono font-bold text-rose-500 block">Ambulance (102)</span>
          <span className="text-xl font-black text-slate-900 dark:text-white">{ambulanceCount}</span>
          <span className="text-[10px] text-slate-500 block">Medical calls</span>
        </div>

        <div className="bg-white dark:bg-slate-800 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <span className="text-[10px] uppercase font-mono font-bold text-orange-500 block">Fire (101)</span>
          <span className="text-xl font-black text-slate-900 dark:text-white">{fireCount}</span>
          <span className="text-[10px] text-slate-500 block">Brigade rescues</span>
        </div>

        <div className="bg-white dark:bg-slate-800 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <span className="text-[10px] uppercase font-mono font-bold text-blue-500 block">Citizens in Grid</span>
          <span className="text-xl font-black text-slate-900 dark:text-white">{users.length}</span>
          <span className="text-[10px] text-slate-500 block">Registered profiles</span>
        </div>
      </div>

      {/* Main Section Header with Tabs, Search, and Filters */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-700/80 pb-4">
          {/* Sub Navigation Tabs */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-900 p-1 rounded-2xl border border-slate-200 dark:border-slate-800 self-start">
            <button
              onClick={() => setSubTab("requests")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer ${
                subTab === "requests"
                  ? "bg-red-600 text-white shadow-md"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>Service Request Timeline ({emergencies.length})</span>
            </button>

            <button
              onClick={() => setSubTab("citizens")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer ${
                subTab === "citizens"
                  ? "bg-blue-600 text-white shadow-md"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Citizen Profiles & Data ({users.length})</span>
            </button>
          </div>

          {/* Export Action */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm transition cursor-pointer"
              title="Download full CSV report of emergency requests with timestamps & nearest stations"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV Report</span>
            </button>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
          <div className="sm:col-span-6 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                subTab === "requests"
                  ? "Search by citizen name, phone, service requested, landmark..."
                  : "Search citizens by name, phone, email, blood group, address..."
              }
              className="w-full pl-9.5 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-red-500"
            />
          </div>

          {subTab === "requests" && (
            <>
              <div className="sm:col-span-3">
                <select
                  value={serviceFilter}
                  onChange={(e) => setServiceFilter(e.target.value as any)}
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none"
                >
                  <option value="all">All Emergency Services</option>
                  <option value="police">🚨 Police Dispatch (100)</option>
                  <option value="ambulance">🚑 Ambulance Trauma (102)</option>
                  <option value="fire">🔥 Fire Brigade (101)</option>
                  <option value="lost">⚠️ Lost Device / Rescue</option>
                </select>
              </div>

              <div className="sm:col-span-3">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none"
                >
                  <option value="all">All Statuses (Active & Resolved)</option>
                  <option value="active">🔴 Active Signals Only</option>
                  <option value="resolved">🟢 Resolved Incidents</option>
                </select>
              </div>
            </>
          )}
        </div>

        {/* ================= VIEW 1: SERVICE REQUEST CHRONOLOGICAL TIMELINE & LOGS ================= */}
        {subTab === "requests" && (
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-mono font-black uppercase tracking-wider text-slate-500">
                Citizen Emergency Requests (With Exact Timestamp & Service Required)
              </h3>
              <span className="text-xs font-bold text-slate-500">
                Showing {filteredRequests.length} of {emergencies.length} records
              </span>
            </div>

            {filteredRequests.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                <Clock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-bold text-slate-600 dark:text-slate-400">
                  No emergency requests match your current filters.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredRequests.map((alert) => {
                  const nearestProvider = getNearestProviderForAlert(alert);
                  const createdDate = new Date(alert.createdAt);
                  const timeFormatted = createdDate.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  });
                  const dateFormatted = createdDate.toLocaleDateString([], {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  });

                  return (
                    <div
                      key={alert.id}
                      className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                        alert.status === "active"
                          ? "bg-red-50/40 dark:bg-red-950/20 border-red-300 dark:border-red-800 shadow-sm"
                          : "bg-white dark:bg-slate-850 border-slate-200 dark:border-slate-700/80"
                      }`}
                    >
                      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                        {/* Left Info: Timestamp, Citizen details, and Service Needed */}
                        <div className="space-y-2.5 flex-1 min-w-0">
                          {/* Top Tag Row: Date & Time + Service Type + Status */}
                          <div className="flex items-center flex-wrap gap-2">
                            {/* Exact Timestamp */}
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-900 text-white rounded-lg text-xs font-mono font-black shadow-xs">
                              <Calendar className="w-3.5 h-3.5 text-amber-400" />
                              <span>{dateFormatted} at {timeFormatted}</span>
                            </div>

                            {/* Service Requested Badge */}
                            {getServiceBadge(alert.type, alert.serviceName)}

                            {/* Status */}
                            <span
                              className={`px-2.5 py-1 rounded-lg text-xs font-black uppercase tracking-wider ${
                                alert.status === "active"
                                  ? "bg-red-600 text-white animate-pulse shadow-xs"
                                  : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                              }`}
                            >
                              {alert.status === "active" ? "🚨 Active Request" : "✅ Resolved"}
                            </span>

                            {/* Dialed on user device note */}
                            <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-mono px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                              📱 Auto-Dialing held on citizen device
                            </span>
                          </div>

                          {/* Citizen Identification */}
                          <div className="flex items-center gap-3 flex-wrap pt-1">
                            <h4 className="text-base font-black text-slate-900 dark:text-white">
                              {alert.userName || "Citizen User"}
                            </h4>
                            <a
                              href={`tel:${alert.userPhone}`}
                              className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                            >
                              <Phone className="w-3.5 h-3.5" />
                              <span>{alert.userPhone}</span>
                            </a>
                            {alert.deviceId && (
                              <span className="text-[10px] font-mono text-slate-400">
                                Terminal: {alert.deviceName || alert.deviceId.slice(0, 10)}
                              </span>
                            )}
                          </div>

                          {/* Incident Details & Comments */}
                          {alert.details && (
                            <p className="text-xs text-slate-700 dark:text-slate-300 bg-white/80 dark:bg-slate-800/80 p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-700">
                              <strong className="text-slate-900 dark:text-white">Citizen Report: </strong>
                              {alert.details}
                            </p>
                          )}

                          {/* Nearest Emergency Station Dispatched */}
                          <div className="bg-red-50/80 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                            <div className="min-w-0">
                              <span className="text-[10px] font-mono font-extrabold text-red-600 dark:text-red-400 uppercase block">
                                📍 Nearest Local Station ({nearestProvider ? nearestProvider.distanceFormatted : "In Range"} • {nearestProvider ? `${nearestProvider.directionArrow} ${nearestProvider.directionLabel}` : "GPS Proximity"})
                              </span>
                              <span className="text-xs font-black text-slate-900 dark:text-white truncate block">
                                {alert.nearestStation || (nearestProvider ? nearestProvider.provider.name : "Local Response Unit")}
                              </span>
                              <span className="text-[10px] text-slate-500 font-mono block truncate">
                                {nearestProvider ? nearestProvider.provider.address : "Nepal Emergency Grid"}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 flex-shrink-0">
                              <a
                                href={`tel:${alert.nearestStationPhone || (nearestProvider ? nearestProvider.provider.phone : "100")}`}
                                className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white font-mono font-extrabold text-xs rounded-xl transition flex items-center gap-1 shadow-sm"
                                title="Call nearest station directly"
                              >
                                <Phone className="w-3 h-3" />
                                <span>{alert.nearestStationPhone || (nearestProvider ? nearestProvider.provider.phone : "100")}</span>
                              </a>
                            </div>
                          </div>

                          {/* Coordinates & Landmark */}
                          <div className="flex items-center gap-2 text-xs text-slate-500 font-mono flex-wrap">
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5 text-red-600" />
                              <span>{alert.location?.lat.toFixed(5)}, {alert.location?.lng.toFixed(5)}</span>
                            </span>
                            {alert.address && (
                              <span>• {alert.address}</span>
                            )}
                          </div>
                        </div>

                        {/* Right Action Buttons */}
                        <div className="flex flex-row lg:flex-col items-center lg:items-end gap-2 flex-shrink-0 pt-2 lg:pt-0">
                          <button
                            onClick={() => onSelectEmergency(alert)}
                            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-sm cursor-pointer"
                            title="Focus master map radar on this citizen"
                          >
                            <MapPin className="w-3.5 h-3.5 text-red-400" />
                            <span>Plot on Map</span>
                          </button>

                          {/* Redirect Service Button */}
                          {alert.status === "active" && onRedirectEmergencyService && (
                            <button
                              onClick={() => {
                                setSelectedRequestForRedirect(alert);
                                setNewRedirectType(alert.type);
                                setRedirectNotes("");
                              }}
                              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-sm cursor-pointer"
                              title="Redirect or re-assign emergency service for this citizen"
                            >
                              <ArrowRightLeft className="w-3.5 h-3.5" />
                              <span>Redirect Service</span>
                            </button>
                          )}

                          {alert.status === "active" ? (
                            <button
                              onClick={() => onResolveEmergency(alert)}
                              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-sm cursor-pointer"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Mark Resolved</span>
                            </button>
                          ) : (
                            <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                              Resolved: {alert.resolvedAt ? new Date(alert.resolvedAt).toLocaleTimeString() : "Yes"}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ================= VIEW 2: COMPREHENSIVE CITIZEN PROFILES & USER DATA ================= */}
        {subTab === "citizens" && (
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-mono font-black uppercase tracking-wider text-slate-500">
                Registered Citizen Profiles & Device Telemetry
              </h3>
              <span className="text-xs font-bold text-slate-500">
                {filteredUsers.length} Citizens in Registry
              </span>
            </div>

            {filteredUsers.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-bold text-slate-600 dark:text-slate-400">
                  No citizen profiles found matching "{searchQuery}".
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredUsers.map((user) => {
                  const userRequests = emergencies.filter((e) => e.userId === user.uid);
                  const activeUserRequests = userRequests.filter((e) => e.status === "active");
                  const deviceCount = user.devices ? Object.keys(user.devices).length : 1;

                  return (
                    <div
                      key={user.uid}
                      className="bg-white dark:bg-slate-850 p-5 rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-sm space-y-4 hover:border-slate-300 dark:hover:border-slate-600 transition"
                    >
                      {/* Top Header: Name, Role & Status */}
                      <div className="flex items-start justify-between gap-3 border-b border-slate-100 dark:border-slate-750 pb-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-black text-lg flex items-center justify-center flex-shrink-0 shadow-sm">
                            {user.fullName.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-base font-black text-slate-900 dark:text-white truncate">
                              {user.fullName}
                            </h4>
                            <div className="flex items-center gap-2 text-xs font-mono text-slate-500">
                              <span>{user.email}</span>
                              <span>•</span>
                              <span className="capitalize font-bold text-blue-600">{user.role}</span>
                            </div>
                          </div>
                        </div>

                        {/* Status Badge */}
                        <span
                          className={`px-2.5 py-1 rounded-lg text-xs font-black uppercase tracking-wider flex-shrink-0 ${
                            user.status === "emergency"
                              ? "bg-red-600 text-white animate-pulse"
                              : user.status === "lost"
                              ? "bg-amber-500 text-slate-950 font-bold"
                              : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                          }`}
                        >
                          {user.status}
                        </span>
                      </div>

                      {/* Key Profile Details Grid */}
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="bg-slate-50 dark:bg-slate-900 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                          <span className="text-[10px] uppercase font-mono font-bold text-slate-400 block">
                            Direct Phone
                          </span>
                          <a
                            href={`tel:${user.phone}`}
                            className="font-black text-slate-900 dark:text-white hover:text-blue-600 flex items-center gap-1 font-mono"
                          >
                            <Phone className="w-3 h-3 text-blue-600" />
                            <span>{user.phone}</span>
                          </a>
                        </div>

                        <div className="bg-slate-50 dark:bg-slate-900 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                          <span className="text-[10px] uppercase font-mono font-bold text-slate-400 block">
                            Blood Group
                          </span>
                          <span className="font-black text-red-600 dark:text-red-400">
                            {user.bloodGroup || "O+ (Default)"}
                          </span>
                        </div>

                        <div className="bg-slate-50 dark:bg-slate-900 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 col-span-2">
                          <span className="text-[10px] uppercase font-mono font-bold text-slate-400 block">
                            Emergency Family Contact
                          </span>
                          <div className="flex items-center justify-between gap-2 mt-0.5">
                            <span className="font-bold text-slate-800 dark:text-slate-200 truncate">
                              {user.emergencyContactName || "Nepal Emergency Contact"}
                            </span>
                            {user.emergencyContactPhone && (
                              <a
                                href={`tel:${user.emergencyContactPhone}`}
                                className="font-mono text-xs text-blue-600 dark:text-blue-400 hover:underline font-black"
                              >
                                {user.emergencyContactPhone}
                              </a>
                            )}
                          </div>
                        </div>

                        {user.address && (
                          <div className="bg-slate-50 dark:bg-slate-900 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 col-span-2">
                            <span className="text-[10px] uppercase font-mono font-bold text-slate-400 block">
                              Registered Address / Landmark
                            </span>
                            <span className="text-slate-700 dark:text-slate-300 font-medium">
                              📍 {user.address}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Registered Devices & Telemetry */}
                      <div className="bg-slate-50 dark:bg-slate-900/70 p-3 rounded-xl border border-slate-100 dark:border-slate-800 space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-mono font-bold text-slate-500 flex items-center gap-1">
                            <Smartphone className="w-3.5 h-3.5 text-slate-400" />
                            <span>Connected Devices ({deviceCount})</span>
                          </span>
                          <span className="text-[10px] font-mono text-slate-400">
                            Last active: {new Date(user.updatedAt).toLocaleTimeString()}
                          </span>
                        </div>

                        {user.lastLocation && (
                          <p className="text-[11px] font-mono text-slate-600 dark:text-slate-400 truncate">
                            GPS: {user.lastLocation.lat.toFixed(5)}, {user.lastLocation.lng.toFixed(5)}
                            {user.lastLocation.speed ? ` • ${user.lastLocation.speed.toFixed(0)} km/h` : ""}
                          </p>
                        )}
                      </div>

                      {/* Request Stats & Actions */}
                      <div className="flex items-center justify-between pt-1 gap-2 flex-wrap">
                        <span className="text-xs font-mono font-bold text-slate-500">
                          SOS History: <strong className="text-slate-900 dark:text-white">{userRequests.length}</strong> total ({activeUserRequests.length} active)
                        </span>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => onSelectUser(user)}
                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition flex items-center gap-1 cursor-pointer"
                          >
                            <MapPin className="w-3 h-3" />
                            <span>Plot on Radar</span>
                          </button>

                          {user.status !== "normal" && (
                            <button
                              onClick={() => onResetUserStatus(user)}
                              className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 text-slate-800 dark:text-slate-100 font-bold text-xs rounded-xl transition cursor-pointer"
                            >
                              Reset Normal
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Redirect Service Modal for Admin */}
      {selectedRequestForRedirect && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-850 rounded-3xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-700 shadow-2xl space-y-4 text-slate-800 dark:text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-750 pb-3">
              <h3 className="text-base font-black flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5 text-indigo-600" />
                <span>Redirect Emergency Service</span>
              </h3>
              <button
                onClick={() => setSelectedRequestForRedirect(null)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Re-route citizen <strong>{selectedRequestForRedirect.userName}</strong> ({selectedRequestForRedirect.userPhone}) to a different emergency service department:
            </p>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                New Target Service:
              </label>
              <select
                value={newRedirectType}
                onChange={(e) => setNewRedirectType(e.target.value as EmergencyType)}
                className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white"
              >
                <option value="police">🚨 Nepal Police (100)</option>
                <option value="ambulance">🚑 Urgent Ambulance (102)</option>
                <option value="fire">🔥 Fire Brigade (101)</option>
                <option value="lost">⚠️ Lost Device / Rescue (1155)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Dispatcher Notes (Optional):
              </label>
              <textarea
                value={redirectNotes}
                onChange={(e) => setRedirectNotes(e.target.value)}
                placeholder="Reason: e.g. Rerouting from police to ambulance due to reported trauma injuries..."
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs min-h-[70px]"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-750">
              <button
                onClick={() => setSelectedRequestForRedirect(null)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (onRedirectEmergencyService) {
                    onRedirectEmergencyService(selectedRequestForRedirect, newRedirectType, redirectNotes);
                  }
                  setSelectedRequestForRedirect(null);
                }}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-xl shadow"
              >
                Confirm Redirection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
