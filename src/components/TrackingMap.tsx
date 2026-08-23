import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import { UserProfile, EmergencyAlert, LocationBreadcrumb } from "../types";
import {
  calculateBearing,
  getCompassDirection,
  calculateDistanceMeters,
  estimateSpeedKmH,
  formatCoordinates,
} from "../utils/geoUtils";
import {
  Compass,
  Navigation,
  Crosshair,
  Footprints,
  Activity,
  Phone,
  Radio,
  Eye,
  RefreshCw,
  Zap,
  TrendingUp,
  MapPin,
  Play,
  Pause,
} from "lucide-react";

interface TrackingMapProps {
  users?: UserProfile[];
  emergencies?: EmergencyAlert[];
  selectedUser?: UserProfile | null;
  selectedEmergency?: EmergencyAlert | null;
  onSelectUser?: (user: UserProfile) => void;
  onMapClick?: (lat: number, lng: number) => void;
  interactive?: boolean;
  simulateLocation?: { lat: number; lng: number } | null;
  onSimulateMove?: (newLat: number, newLng: number, heading: number, speed: number) => void;
}

export default function TrackingMap({
  users = [],
  emergencies = [],
  selectedUser = null,
  selectedEmergency = null,
  onSelectUser,
  onMapClick,
  interactive = false,
  simulateLocation = null,
  onSimulateMove,
}: TrackingMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<{ [key: string]: L.Marker }>({});
  const circlesRef = useRef<{ [key: string]: L.Circle }>({});
  const trailsRef = useRef<{ [key: string]: L.Polyline }>({});
  const simulateMarkerRef = useRef<L.Marker | null>(null);

  // Trajectory history stored in ref (uid -> breadcrumb array)
  const trajectoryHistoryRef = useRef<{ [uid: string]: LocationBreadcrumb[] }>({});

  // UI state for Live Tracking HUD
  const [autoFollow, setAutoFollow] = useState<boolean>(true);
  const [showTrails, setShowTrails] = useState<boolean>(true);
  const [currentBearing, setCurrentBearing] = useState<number>(0);
  const [currentSpeed, setCurrentSpeed] = useState<number>(0);
  const [lastUpdateText, setLastUpdateText] = useState<string>("Just now");
  const [isSimulatingWalk, setIsSimulatingWalk] = useState<boolean>(false);
  const simWalkTimerRef = useRef<any>(null);

  // Initialize Map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const defaultLat = 27.7172;
    const defaultLng = 85.324;

    const map = L.map(containerRef.current, {
      zoomControl: true,
      scrollWheelZoom: true,
    }).setView([defaultLat, defaultLng], 13);

    mapRef.current = map;

    // Standard OpenStreetMap tiles
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap</a> Nepal Live Grid',
    }).addTo(map);

    if (interactive && onMapClick) {
      map.on("click", (e: L.LeafletMouseEvent) => {
        onMapClick(e.latlng.lat, e.latlng.lng);
      });
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Update Breadcrumb trails and calculate live bearing/speed whenever users prop changes
  useEffect(() => {
    users.forEach((u) => {
      if (!u.lastLocation) return;
      const { lat, lng, timestamp } = u.lastLocation;
      const history = trajectoryHistoryRef.current[u.uid] || [];

      // Check if location changed
      const lastPoint = history[history.length - 1];
      if (
        !lastPoint ||
        Math.abs(lastPoint.lat - lat) > 0.00001 ||
        Math.abs(lastPoint.lng - lng) > 0.00001
      ) {
        let heading = u.lastLocation.heading;
        let speed = u.lastLocation.speed;

        if (lastPoint) {
          if (heading === undefined || heading === null) {
            heading = calculateBearing(lastPoint.lat, lastPoint.lng, lat, lng);
          }
          if (speed === undefined || speed === null) {
            speed = estimateSpeedKmH(
              lastPoint.lat,
              lastPoint.lng,
              lastPoint.timestamp,
              lat,
              lng,
              timestamp || new Date().toISOString()
            );
          }
        } else {
          heading = heading || 0;
          speed = speed || 0;
        }

        const newPoint: LocationBreadcrumb = {
          lat,
          lng,
          heading,
          speed,
          timestamp: timestamp || new Date().toISOString(),
        };

        // Keep last 40 trajectory points for performance
        const updatedHistory = [...history, newPoint].slice(-40);
        trajectoryHistoryRef.current[u.uid] = updatedHistory;

        // If this is the currently selected target, update HUD state
        if (selectedUser?.uid === u.uid) {
          setCurrentBearing(heading || 0);
          setCurrentSpeed(speed || 0);
          setLastUpdateText("Just now");
        }
      }
    });
  }, [users, selectedUser]);

  // Center/Follow logic when selectedUser or selectedEmergency updates
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (selectedUser?.lastLocation) {
      const { lat, lng } = selectedUser.lastLocation;
      if (autoFollow) {
        map.panTo([lat, lng], { animate: true, duration: 0.8 });
      }

      // Check history for bearing
      const history = trajectoryHistoryRef.current[selectedUser.uid] || [];
      if (history.length > 0) {
        const latest = history[history.length - 1];
        setCurrentBearing(latest.heading || 0);
        setCurrentSpeed(latest.speed || 0);
      }
    } else if (selectedEmergency?.location) {
      const { lat, lng } = selectedEmergency.location;
      map.setView([lat, lng], 16, { animate: true, duration: 1 });
    } else if (simulateLocation) {
      map.setView([simulateLocation.lat, simulateLocation.lng], 15, {
        animate: true,
        duration: 0.8,
      });
    }
  }, [selectedUser, selectedEmergency, simulateLocation, autoFollow]);

  // Render & Update Markers, Circles, Directional Cones, and Trajectory Lines
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear old elements
    (Object.values(markersRef.current) as L.Marker[]).forEach((m) => m.remove());
    (Object.values(circlesRef.current) as L.Circle[]).forEach((c) => c.remove());
    (Object.values(trailsRef.current) as L.Polyline[]).forEach((p) => p.remove());
    markersRef.current = {};
    circlesRef.current = {};
    trailsRef.current = {};

    // 1. Draw Trajectory Polylines for each user
    if (showTrails) {
      users.forEach((u) => {
        const history = trajectoryHistoryRef.current[u.uid] || [];
        if (history.length > 1) {
          const latLngs = history.map((p) => [p.lat, p.lng] as [number, number]);
          const isTarget = selectedUser?.uid === u.uid;

          const polyline = L.polyline(latLngs, {
            color: isTarget
              ? "#6366f1"
              : u.status === "emergency"
              ? "#ef4444"
              : u.status === "lost"
              ? "#f59e0b"
              : "#3b82f6",
            weight: isTarget ? 4 : 2.5,
            opacity: isTarget ? 0.85 : 0.5,
            dashArray: isTarget ? "6, 6" : undefined,
            smoothFactor: 1,
          }).addTo(map);

          trailsRef.current[`trail-${u.uid}`] = polyline;
        }
      });
    }

    // 2. Draw Users with Directional Pointer
    users.forEach((user) => {
      if (!user.lastLocation) return;
      const { lat, lng, accuracy } = user.lastLocation;
      const isSelected = selectedUser?.uid === user.uid;

      // Compute heading for marker orientation
      const history = trajectoryHistoryRef.current[user.uid] || [];
      const heading =
        user.lastLocation.heading !== undefined
          ? user.lastLocation.heading
          : history.length > 0
          ? history[history.length - 1].heading || 0
          : 0;

      let colorClass = "bg-blue-600";
      let ringColor = "#3b82f6";
      let glowClass = "bg-blue-400";
      let statusIcon = "👤";

      if (user.status === "emergency") {
        colorClass = "bg-rose-600";
        ringColor = "#ef4444";
        glowClass = "bg-rose-500 animate-ping";
        statusIcon = "🚨";
      } else if (user.status === "lost") {
        colorClass = "bg-amber-500";
        ringColor = "#f59e0b";
        glowClass = "bg-amber-400 animate-pulse";
        statusIcon = "⚠️";
      }

      const compassInfo = getCompassDirection(heading);

      // Custom HTML Marker with Rotating Directional Heading Pointer Cone
      const userDivIcon = L.divIcon({
        className: "custom-user-tracker-marker",
        iconSize: [48, 48],
        iconAnchor: [24, 24],
        html: `
          <div class="relative w-12 h-12 flex items-center justify-center cursor-pointer transition-transform duration-300">
            <!-- Pulsing radar wave -->
            <span class="absolute inline-flex h-full w-full rounded-full ${glowClass} opacity-60"></span>

            <!-- Directional Pointer Arrow (Rotates based on heading) -->
            <div 
              class="absolute inset-0 flex items-center justify-center transition-transform duration-500"
              style="transform: rotate(${heading}deg);"
            >
              <div class="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[14px] ${
                isSelected ? "border-b-indigo-400" : "border-b-slate-800"
              } -translate-y-5 filter drop-shadow-md"></div>
            </div>

            <!-- Inner Avatar Disk -->
            <div class="relative z-10 flex items-center justify-center w-8 h-8 rounded-full ${colorClass} text-white border-2 ${
          isSelected ? "border-indigo-200 ring-4 ring-indigo-500/40" : "border-white"
        } shadow-lg">
              <span class="text-xs font-bold">${statusIcon}</span>
            </div>

            <!-- Direction Badge for selected or moving user -->
            ${
              isSelected
                ? `<div class="absolute -bottom-2 z-20 bg-slate-950/90 text-indigo-300 text-[8px] font-mono font-bold px-1.5 py-0.5 rounded-full border border-indigo-500/60 shadow whitespace-nowrap">
                    ${heading}° ${compassInfo.code}
                  </div>`
                : ""
            }
          </div>
        `,
      });

      const marker = L.marker([lat, lng], { icon: userDivIcon }).addTo(map);

      marker.on("click", () => {
        if (onSelectUser) onSelectUser(user);
      });

      marker.bindPopup(`
        <div class="p-1 min-w-48 leading-tight font-sans">
          <div class="flex items-center gap-1.5 mb-1 bg-slate-900 text-white p-1.5 rounded-lg">
            <span class="text-xs font-bold">${user.fullName}</span>
            <span class="text-[9px] ml-auto px-1.5 py-0.5 rounded bg-indigo-600 text-white font-mono uppercase">${user.status}</span>
          </div>
          <p class="text-[11px] text-slate-600 mb-0.5"><b>📞 Phone:</b> ${user.phone}</p>
          <p class="text-[11px] text-slate-600 mb-0.5"><b>🧭 Heading:</b> ${heading}° (${compassInfo.label})</p>
          <p class="text-[11px] text-slate-600 mb-1"><b>📍 Lat, Lng:</b> ${lat.toFixed(5)}, ${lng.toFixed(5)}</p>
          <div class="text-[9px] text-slate-400 border-t pt-1 font-mono">Sync: ${new Date(
            user.updatedAt
          ).toLocaleTimeString()}</div>
        </div>
      `);

      markersRef.current[`user-${user.uid}`] = marker;

      // Accuracy ring
      if (accuracy && accuracy > 0) {
        const circle = L.circle([lat, lng], {
          radius: accuracy,
          color: ringColor,
          fillColor: ringColor,
          fillOpacity: isSelected ? 0.18 : 0.08,
          weight: isSelected ? 2 : 1,
        }).addTo(map);
        circlesRef.current[`user-circle-${user.uid}`] = circle;
      }
    });

    // 3. Draw Active Emergencies
    emergencies.forEach((alert) => {
      if (alert.status !== "active") return;
      const { lat, lng } = alert.location;

      const dangerIcon = L.divIcon({
        className: "custom-leaflet-marker",
        iconSize: [44, 44],
        iconAnchor: [22, 22],
        html: `
          <div class="relative w-11 h-11 flex items-center justify-center">
            <span class="absolute inline-flex h-full w-full rounded-full bg-rose-600 animate-ping opacity-85"></span>
            <div class="relative flex items-center justify-center w-8 h-8 rounded-full bg-rose-600 text-white border-2 border-white shadow-2xl">
              <span class="text-xs font-semibold">🚨</span>
            </div>
            <span class="absolute -top-1 -right-1 bg-red-800 text-white text-[8px] font-bold px-1 rounded uppercase tracking-wider scale-90 border border-white">
              ${alert.type.toUpperCase()}
            </span>
          </div>
        `,
      });

      const marker = L.marker([lat, lng], { icon: dangerIcon }).addTo(map);
      marker.bindPopup(`
        <div class="p-1 min-w-48 leading-tight">
          <div class="flex items-center gap-1.5 mb-1.5 bg-rose-50 text-rose-800 p-1.5 rounded border border-rose-100">
            <span class="text-xs font-extrabold">🚨 EMERGENCY SOS</span>
            <span class="text-[9px] ml-auto px-1 bg-rose-600 text-white rounded uppercase font-bold tracking-widest">${alert.type}</span>
          </div>
          <p class="text-[11px] text-slate-800 mb-0.5"><b>Citizen:</b> ${alert.userName}</p>
          <p class="text-[11px] text-slate-800 mb-0.5"><b>Phone:</b> ${alert.userPhone}</p>
          <p class="text-[11px] text-slate-600 mb-1 bg-slate-50 p-1 text-[10px] rounded italic">"${alert.details || "SOS protocol active"}"</p>
          <div class="text-[9px] text-slate-400 font-mono mt-1">Reported: ${new Date(
            alert.createdAt
          ).toLocaleTimeString()}</div>
        </div>
      `);

      markersRef.current[`emergency-${alert.id}`] = marker;
    });
  }, [users, emergencies, selectedUser, showTrails]);

  // Simulation movement runner (Simulates a citizen walking around Kathmandu, turning corners and changing heading)
  const toggleLiveWalkSimulation = () => {
    if (isSimulatingWalk) {
      if (simWalkTimerRef.current) clearInterval(simWalkTimerRef.current);
      setIsSimulatingWalk(false);
      return;
    }

    if (!selectedUser?.lastLocation && !simulateLocation) return;

    setIsSimulatingWalk(true);
    let step = 0;
    // Walk loop with turning angles
    const bearings = [45, 90, 135, 180, 225, 270, 315, 360];

    simWalkTimerRef.current = setInterval(() => {
      step++;
      const currentLat = selectedUser?.lastLocation?.lat || simulateLocation?.lat || 27.7172;
      const currentLng = selectedUser?.lastLocation?.lng || simulateLocation?.lng || 85.324;

      const currentHeading = bearings[step % bearings.length];
      const rad = (currentHeading * Math.PI) / 180;
      const distDelta = 0.00025; // ~25 meters step
      const nextLat = currentLat + Math.cos(rad) * distDelta;
      const nextLng = currentLng + Math.sin(rad) * distDelta;
      const simSpeed = 12 + Math.round(Math.random() * 8); // 12-20 km/h

      if (onSimulateMove) {
        onSimulateMove(nextLat, nextLng, currentHeading, simSpeed);
      } else if (onMapClick) {
        onMapClick(nextLat, nextLng);
      }
    }, 2000);
  };

  useEffect(() => {
    return () => {
      if (simWalkTimerRef.current) clearInterval(simWalkTimerRef.current);
    };
  }, []);

  const compassData = getCompassDirection(currentBearing);
  const targetHistory = selectedUser ? trajectoryHistoryRef.current[selectedUser.uid] || [] : [];

  return (
    <div className="relative w-full h-full rounded-2xl overflow-hidden border border-slate-200 shadow-sm bg-slate-950 flex flex-col">
      {/* Top Map Control Bar */}
      <div className="absolute top-3 left-3 right-3 z-[1000] flex items-center justify-between pointer-events-none">
        {/* Left Status pill */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900/90 text-white rounded-xl shadow-lg border border-slate-800 backdrop-blur-md text-xs font-semibold">
            <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span>Nepal GPS Dispatch Grid</span>
            <span className="text-[10px] px-1.5 py-0.5 bg-emerald-950 text-emerald-300 rounded font-mono border border-emerald-800">
              LIVE
            </span>
          </div>

          {selectedUser && (
            <button
              onClick={() => setAutoFollow(!autoFollow)}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold transition shadow-md pointer-events-auto backdrop-blur-md border ${
                autoFollow
                  ? "bg-indigo-600 text-white border-indigo-500 shadow-indigo-500/20"
                  : "bg-slate-900/90 text-slate-300 border-slate-800 hover:text-white"
              }`}
              title="Automatically keep camera centered on the active tracking target as they move"
            >
              <Crosshair className={`w-3.5 h-3.5 ${autoFollow ? "animate-spin" : ""}`} />
              <span>Auto-Follow: {autoFollow ? "ON" : "OFF"}</span>
            </button>
          )}
        </div>

        {/* Right Trail & Simulation Controls */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <button
            onClick={() => setShowTrails(!showTrails)}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold transition shadow-md backdrop-blur-md border ${
              showTrails
                ? "bg-indigo-950/90 text-indigo-300 border-indigo-800"
                : "bg-slate-900/90 text-slate-400 border-slate-800"
            }`}
            title="Toggle movement breadcrumb trajectory path"
          >
            <Footprints className="w-3.5 h-3.5" />
            <span>Trails: {showTrails ? "ON" : "OFF"}</span>
          </button>

          {/* Simulate Walking / Live direction turn */}
          {selectedUser && (
            <button
              onClick={toggleLiveWalkSimulation}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold transition shadow-md backdrop-blur-md border ${
                isSimulatingWalk
                  ? "bg-amber-600 text-white border-amber-500 animate-pulse"
                  : "bg-slate-900/90 text-emerald-300 border-slate-800 hover:border-emerald-700"
              }`}
              title="Simulate continuous live walking with changing directions for this citizen"
            >
              {isSimulatingWalk ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span>{isSimulatingWalk ? "Stop Motion" : "Simulate Movement"}</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Leaflet Canvas Element */}
      <div id="leaflet-map-element" ref={containerRef} className="w-full h-full z-10" />

      {/* Bottom Live Target Telemetry & Direction HUD (Opens when a citizen is selected) */}
      {selectedUser && selectedUser.lastLocation && (
        <div className="absolute bottom-3 left-3 right-3 z-[1000] bg-slate-900/95 border border-slate-800/90 rounded-2xl p-3.5 shadow-2xl backdrop-blur-xl text-white">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
            {/* Target Identity & Info */}
            <div className="flex items-center gap-3">
              {/* Rotating Compass Indicator Dial */}
              <div className="relative w-12 h-12 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-center shadow-inner flex-shrink-0">
                <div
                  className="transition-transform duration-500 flex items-center justify-center"
                  style={{ transform: `rotate(${currentBearing}deg)` }}
                >
                  <Compass className="w-7 h-7 text-indigo-400" />
                </div>
                <span className="absolute -top-1 -right-1 bg-indigo-600 text-[8px] font-mono font-bold px-1 rounded text-white">
                  {compassData.code}
                </span>
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-extrabold text-white">{selectedUser.fullName}</h4>
                  <span
                    className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border font-mono ${
                      selectedUser.status === "emergency"
                        ? "bg-rose-950 text-rose-300 border-rose-800"
                        : selectedUser.status === "lost"
                        ? "bg-amber-950 text-amber-300 border-amber-800"
                        : "bg-emerald-950 text-emerald-300 border-emerald-800"
                    }`}
                  >
                    {selectedUser.status}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-400 font-mono mt-0.5">
                  <span>📞 {selectedUser.phone}</span>
                  <span>•</span>
                  <span>{formatCoordinates(selectedUser.lastLocation.lat, selectedUser.lastLocation.lng)}</span>
                </div>
              </div>
            </div>

            {/* Real-Time Live Telemetry Metrics */}
            <div className="flex items-center gap-2 flex-wrap w-full md:w-auto">
              {/* Heading / Direction Box */}
              <div className="bg-slate-950/80 border border-slate-800/80 px-3 py-1.5 rounded-xl flex items-center gap-2 flex-1 md:flex-initial">
                <Navigation className="w-4 h-4 text-indigo-400" />
                <div>
                  <div className="text-[10px] text-slate-400 font-mono uppercase">Heading / Direction</div>
                  <div className="text-xs font-bold text-slate-100 font-mono">
                    {currentBearing}° {compassData.label} {compassData.arrow}
                  </div>
                </div>
              </div>

              {/* Speed Meter */}
              <div className="bg-slate-950/80 border border-slate-800/80 px-3 py-1.5 rounded-xl flex items-center gap-2 flex-1 md:flex-initial">
                <Activity className="w-4 h-4 text-emerald-400" />
                <div>
                  <div className="text-[10px] text-slate-400 font-mono uppercase">Ground Speed</div>
                  <div className="text-xs font-bold text-slate-100 font-mono">
                    {currentSpeed > 0 ? `${currentSpeed} km/h` : "Stationary (0 km/h)"}
                  </div>
                </div>
              </div>

              {/* Trajectory Breadcrumbs Points */}
              <div className="bg-slate-950/80 border border-slate-800/80 px-3 py-1.5 rounded-xl hidden sm:flex items-center gap-2">
                <Footprints className="w-4 h-4 text-amber-400" />
                <div>
                  <div className="text-[10px] text-slate-400 font-mono uppercase">Live Trajectory</div>
                  <div className="text-xs font-bold text-slate-100 font-mono">
                    {targetHistory.length} GPS Fixes
                  </div>
                </div>
              </div>

              {/* Action: Recenter / Phone */}
              <a
                href={`tel:${selectedUser.phone}`}
                className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition shadow flex items-center gap-1.5"
                title="Call citizen phone directly"
              >
                <Phone className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Call</span>
              </a>

              <button
                onClick={() => {
                  if (mapRef.current && selectedUser.lastLocation) {
                    mapRef.current.setView(
                      [selectedUser.lastLocation.lat, selectedUser.lastLocation.lng],
                      16,
                      { animate: true, duration: 0.8 }
                    );
                  }
                }}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition border border-slate-700 flex items-center gap-1"
                title="Recenter camera on target"
              >
                <Crosshair className="w-3.5 h-3.5" />
                <span>Center</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
