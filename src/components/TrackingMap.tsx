import { useEffect, useRef, useState, useMemo } from "react";
import L from "leaflet";
import { UserProfile, EmergencyAlert, LocationBreadcrumb } from "../types";
import {
  calculateBearing,
  getCompassDirection,
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
  MapPin,
  Play,
  Pause,
  Layers,
  Maximize2,
  MousePointer,
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
  currentHeading?: number;
  currentSpeed?: number;
  accuracy?: number;
  locationSource?: string;
  address?: string;
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
  currentHeading = 0,
  currentSpeed = 0,
  accuracy = 20,
  locationSource = "gps-high",
  address,
  onSimulateMove,
}: TrackingMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<{ [key: string]: L.Marker }>({});
  const circlesRef = useRef<{ [key: string]: L.Circle }>({});
  const trailsRef = useRef<{ [key: string]: L.Polyline }>({});
  const currentPinRef = useRef<L.Marker | null>(null);
  const currentPinAccuracyCircleRef = useRef<L.Circle | null>(null);

  // Trajectory history stored in ref (uid -> breadcrumb array)
  const trajectoryHistoryRef = useRef<{ [uid: string]: LocationBreadcrumb[] }>({});

  // UI state for Live Tracking HUD
  const [autoFollow, setAutoFollow] = useState<boolean>(true);
  const [showTrails, setShowTrails] = useState<boolean>(true);
  const [activeBearing, setActiveBearing] = useState<number>(currentHeading);
  const [activeSpeed, setActiveSpeed] = useState<number>(currentSpeed);
  const [isSimulatingWalk, setIsSimulatingWalk] = useState<boolean>(false);
  const [mapLayer, setMapLayer] = useState<"standard" | "satellite">("standard");
  const [scrollZoomEnabled, setScrollZoomEnabled] = useState<boolean>(false);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const simWalkTimerRef = useRef<any>(null);

  // Synchronize internal bearing/speed with props if provided
  useEffect(() => {
    if (currentHeading !== undefined) setActiveBearing(currentHeading);
  }, [currentHeading]);

  useEffect(() => {
    if (currentSpeed !== undefined) setActiveSpeed(currentSpeed);
  }, [currentSpeed]);

  // Handle dynamic Scroll Wheel Zoom enable/disable
  useEffect(() => {
    if (!mapRef.current) return;
    if (scrollZoomEnabled) {
      mapRef.current.scrollWheelZoom.enable();
    } else {
      mapRef.current.scrollWheelZoom.disable();
    }
  }, [scrollZoomEnabled]);

  // 1. Initialize Leaflet Map (scrollWheelZoom disabled by default for buttery smooth page scrolling)
  useEffect(() => {
    if (!containerRef.current) return;

    // Fix default Leaflet icon urls to prevent 404 asset failures
    try {
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
        iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
        shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
      });
    } catch (e) {
      console.warn("Leaflet default icon setup notice:", e);
    }

    // Defensive check: If DOM node already has an initialized Leaflet instance, destroy it
    if ((containerRef.current as any)._leaflet_id) {
      try {
        (containerRef.current as any)._leaflet_id = null;
      } catch (e) {
        console.warn("Leaflet ID reset notice:", e);
      }
    }

    if (mapRef.current) {
      try {
        mapRef.current.remove();
      } catch (e) {
        console.warn("Leaflet map remove notice:", e);
      }
      mapRef.current = null;
    }

    try {
      // Initial center: prefer simulateLocation if passed, else Kathmandu
      const initialLat = simulateLocation?.lat || (users.length > 0 && users[0].lastLocation?.lat) || 27.7172;
      const initialLng = simulateLocation?.lng || (users.length > 0 && users[0].lastLocation?.lng) || 85.324;

      const map = L.map(containerRef.current, {
        zoomControl: false, // Zoom control repositioned to bottomright to prevent top header overlaps
        scrollWheelZoom: false, // Prevents map from intercepting page scroll
        touchZoom: true,
        zoomAnimation: true,
        fadeAnimation: true,
      }).setView([initialLat, initialLng], 15);

      mapRef.current = map;

      // Add zoom control at bottom right (standard GIS position)
      L.control.zoom({ position: "bottomright" }).addTo(map);

      // Standard OpenStreetMap tiles with fast caching
      const tileUrl =
        mapLayer === "satellite"
          ? "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

      tileLayerRef.current = L.tileLayer(tileUrl, {
        maxZoom: 19,
        attribution:
          mapLayer === "satellite"
            ? '&copy; <a href="https://www.esri.com/">Esri</a> Satellite Nepal Grid'
            : '&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap</a> Nepal Live Grid',
      }).addTo(map);

      if (interactive && onMapClick) {
        map.on("click", (e: L.LeafletMouseEvent) => {
          onMapClick(e.latlng.lat, e.latlng.lng);
        });
      }

      // Automatically recalculate map dimensions when viewport or container size shifts
      const resizeObserver = new ResizeObserver(() => {
        if (mapRef.current) {
          try {
            mapRef.current.invalidateSize();
          } catch {}
        }
      });
      resizeObserver.observe(containerRef.current);

      return () => {
        resizeObserver.disconnect();
        if (mapRef.current) {
          try {
            mapRef.current.remove();
          } catch {}
          mapRef.current = null;
        }
      };
    } catch (err) {
      console.error("Leaflet map initialization error:", err);
    }
  }, []);

  // Update Tile Layer if user switches between Street and Satellite
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (tileLayerRef.current) {
      tileLayerRef.current.remove();
    }

    const tileUrl =
      mapLayer === "satellite"
        ? "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
        : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

    tileLayerRef.current = L.tileLayer(tileUrl, {
      maxZoom: 19,
      attribution:
        mapLayer === "satellite"
          ? '&copy; <a href="https://www.esri.com/">Esri</a> Satellite'
          : '&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap</a> Live Grid',
    }).addTo(map);
  }, [mapLayer]);

  // 2. Track breadcrumbs for multi-user mode
  useEffect(() => {
    users.forEach((u) => {
      if (!u.lastLocation) return;
      const { lat, lng, timestamp } = u.lastLocation;
      const history = trajectoryHistoryRef.current[u.uid] || [];

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

        const updatedHistory = [...history, newPoint].slice(-40);
        trajectoryHistoryRef.current[u.uid] = updatedHistory;

        if (selectedUser?.uid === u.uid) {
          setActiveBearing(heading || 0);
          setActiveSpeed(speed || 0);
        }
      }
    });
  }, [users, selectedUser]);

  // 3. Center/Follow logic
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (simulateLocation) {
      if (autoFollow) {
        map.panTo([simulateLocation.lat, simulateLocation.lng], {
          animate: true,
          duration: 0.6,
        });
      }
    } else if (selectedUser?.lastLocation) {
      const { lat, lng } = selectedUser.lastLocation;
      if (autoFollow) {
        map.panTo([lat, lng], { animate: true, duration: 0.8 });
      }

      const history = trajectoryHistoryRef.current[selectedUser.uid] || [];
      if (history.length > 0) {
        const latest = history[history.length - 1];
        setActiveBearing(latest.heading || 0);
        setActiveSpeed(latest.speed || 0);
      }
    } else if (selectedEmergency?.location) {
      const { lat, lng } = selectedEmergency.location;
      map.setView([lat, lng], 16, { animate: true, duration: 1 });
    }
  }, [selectedUser, selectedEmergency, simulateLocation, autoFollow]);

    // 4. Render or Smoothly Update Current User Pin (from simulateLocation / Real GPS)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (!simulateLocation) {
      if (currentPinRef.current) {
        currentPinRef.current.remove();
        currentPinRef.current = null;
      }
      if (currentPinAccuracyCircleRef.current) {
        currentPinAccuracyCircleRef.current.remove();
        currentPinAccuracyCircleRef.current = null;
      }
      return;
    }

    const { lat, lng } = simulateLocation;
    const heading = activeBearing || currentHeading || 0;
    const compassInfo = getCompassDirection(heading);
    const isHighGps = locationSource === "gps-high";
    const haloColor = isHighGps ? "#3b82f6" : "#6366f1";

    const readableSource =
      locationSource === "gps-high"
        ? "🛰️ Real Device GPS (High Accuracy)"
        : locationSource === "gps-low"
        ? "📡 Device WiFi / Network GPS"
        : locationSource === "ip"
        ? "🌐 IP Geolocation Network"
        : "📍 Current Coordinates";

    // If marker already exists, smoothly update position & rotation without thrashing DOM
    if (currentPinRef.current) {
      currentPinRef.current.setLatLng([lat, lng]);
      const el = currentPinRef.current.getElement();
      if (el) {
        const arrowEl = el.querySelector(".user-heading-arrow") as HTMLElement;
        if (arrowEl) arrowEl.style.transform = `rotate(${heading}deg)`;
        const badgeEl = el.querySelector(".user-heading-badge") as HTMLElement;
        if (badgeEl) badgeEl.textContent = `${heading}° ${compassInfo.code}`;
      }
    } else {
      const customUserIcon = L.divIcon({
        className: "realtime-user-pin",
        iconSize: [52, 52],
        iconAnchor: [26, 26],
        html: `
          <div class="relative w-[52px] h-[52px] flex items-center justify-center cursor-pointer group">
            <!-- Radar Wave -->
            <span class="absolute inline-flex h-full w-full rounded-full bg-blue-500 opacity-40 animate-ping"></span>
            <span class="absolute inline-flex h-8 w-8 rounded-full bg-blue-400 opacity-30 animate-pulse"></span>

            <!-- Directional Pointer -->
            <div 
              class="user-heading-arrow absolute inset-0 flex items-center justify-center transition-transform duration-300 pointer-events-none"
              style="transform: rotate(${heading}deg);"
            >
              <div class="w-0 h-0 border-l-[7px] border-l-transparent border-r-[7px] border-r-transparent border-b-[16px] border-b-blue-600 -translate-y-5 filter drop-shadow-md"></div>
            </div>

            <!-- Avatar Disc -->
            <div class="relative z-10 flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 text-white border-2 border-white shadow-xl ring-2 ring-blue-400/50">
              <span class="text-xs font-black">📍</span>
            </div>

            <!-- Mini Heading Badge -->
            <div class="user-heading-badge absolute -bottom-2 z-20 bg-slate-900 text-blue-300 text-[8px] font-mono font-bold px-1.5 py-0.5 rounded-full border border-blue-500/60 shadow whitespace-nowrap">
              ${heading}° ${compassInfo.code}
            </div>
          </div>
        `,
      });

      const marker = L.marker([lat, lng], {
        icon: customUserIcon,
        draggable: interactive,
      }).addTo(map);

      if (interactive) {
        marker.on("dragend", (e: any) => {
          const newPos = e.target.getLatLng();
          if (onMapClick) {
            onMapClick(newPos.lat, newPos.lng);
          }
        });
      }

      currentPinRef.current = marker;
    }

    if (currentPinRef.current) {
      currentPinRef.current.bindPopup(`
        <div class="p-1 min-w-[200px] leading-tight font-sans">
          <div class="flex items-center gap-1.5 mb-1.5 bg-blue-600 text-white p-2 rounded-lg">
            <span class="text-xs font-black">📍 Real Device Location</span>
            <span class="text-[9px] ml-auto px-1.5 py-0.5 rounded bg-blue-900 text-white font-mono uppercase">LIVE</span>
          </div>
          <p class="text-[11px] text-slate-700 font-semibold mb-1">${address || "Nepal Coordinates Locked"}</p>
          <p class="text-[10px] text-slate-500 mb-0.5"><b>Source:</b> ${readableSource}</p>
          <p class="text-[10px] text-slate-500 mb-0.5"><b>Coordinates:</b> ${lat.toFixed(5)}, ${lng.toFixed(5)}</p>
          <p class="text-[10px] text-slate-500 mb-0.5"><b>Heading:</b> ${heading}° (${compassInfo.label})</p>
          <p class="text-[10px] text-slate-500 mb-1"><b>Accuracy:</b> ±${accuracy} meters</p>
          ${interactive ? '<p class="text-[9px] text-indigo-600 font-bold border-t pt-1">💡 Drag pin or click map to reposition</p>' : ""}
        </div>
      `);
    }

    // Accuracy circle halo update or create
    if (accuracy && accuracy > 0) {
      if (currentPinAccuracyCircleRef.current) {
        currentPinAccuracyCircleRef.current.setLatLng([lat, lng]);
        currentPinAccuracyCircleRef.current.setRadius(Math.min(Math.max(accuracy, 10), 100));
      } else {
        const circle = L.circle([lat, lng], {
          radius: Math.min(Math.max(accuracy, 10), 100),
          color: haloColor,
          fillColor: haloColor,
          fillOpacity: 0.12,
          weight: 1.5,
        }).addTo(map);
        currentPinAccuracyCircleRef.current = circle;
      }
    }
  }, [simulateLocation, activeBearing, currentHeading, accuracy, locationSource, address, interactive]);

  // 5. Draw Multi-User Markers, Trajectories, and Emergencies
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

      const userDivIcon = L.divIcon({
        className: "custom-user-tracker-marker",
        iconSize: [48, 48],
        iconAnchor: [24, 24],
        html: `
          <div class="relative w-12 h-12 flex items-center justify-center cursor-pointer transition-transform duration-300">
            <span class="absolute inline-flex h-full w-full rounded-full ${glowClass} opacity-60"></span>

            <div 
              class="absolute inset-0 flex items-center justify-center transition-transform duration-500"
              style="transform: rotate(${heading}deg);"
            >
              <div class="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[14px] ${
                isSelected ? "border-b-indigo-400" : "border-b-slate-800"
              } -translate-y-5 filter drop-shadow-md"></div>
            </div>

            <div class="relative z-10 flex items-center justify-center w-8 h-8 rounded-full ${colorClass} text-white border-2 ${
              isSelected ? "border-indigo-200 ring-4 ring-indigo-500/40" : "border-white"
            } shadow-lg">
              <span class="text-xs font-bold">${statusIcon}</span>
            </div>

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

      if (accuracy && accuracy > 0) {
        const circle = L.circle([lat, lng], {
          radius: Math.min(Math.max(accuracy, 10), 200),
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

  // Center on current real location action
  const handleRecenterOnMe = () => {
    const map = mapRef.current;
    if (!map) return;

    if (simulateLocation) {
      map.setView([simulateLocation.lat, simulateLocation.lng], 16, {
        animate: true,
        duration: 0.8,
      });
    } else if (selectedUser?.lastLocation) {
      map.setView([selectedUser.lastLocation.lat, selectedUser.lastLocation.lng], 16, {
        animate: true,
        duration: 0.8,
      });
    }
  };

  // Fit all user markers on map
  const handleFitAllBounds = () => {
    const map = mapRef.current;
    if (!map) return;

    const points: [number, number][] = [];
    if (simulateLocation) points.push([simulateLocation.lat, simulateLocation.lng]);
    users.forEach((u) => {
      if (u.lastLocation) points.push([u.lastLocation.lat, u.lastLocation.lng]);
    });
    emergencies.forEach((e) => {
      if (e.status === "active" && e.location) points.push([e.location.lat, e.location.lng]);
    });

    if (points.length > 1) {
      const bounds = L.latLngBounds(points);
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 });
    } else if (points.length === 1) {
      map.setView(points[0], 15);
    }
  };

  // Simulation movement runner
  const toggleLiveWalkSimulation = () => {
    if (isSimulatingWalk) {
      if (simWalkTimerRef.current) clearInterval(simWalkTimerRef.current);
      setIsSimulatingWalk(false);
      return;
    }

    if (!selectedUser?.lastLocation && !simulateLocation) return;

    setIsSimulatingWalk(true);
    let step = 0;
    const bearings = [45, 90, 135, 180, 225, 270, 315, 360];

    simWalkTimerRef.current = setInterval(() => {
      step++;
      const currentLat = selectedUser?.lastLocation?.lat || simulateLocation?.lat || 27.7172;
      const currentLng = selectedUser?.lastLocation?.lng || simulateLocation?.lng || 85.324;

      const heading = bearings[step % bearings.length];
      const rad = (heading * Math.PI) / 180;
      const distDelta = 0.00025; // ~25 meters step
      const nextLat = currentLat + Math.cos(rad) * distDelta;
      const nextLng = currentLng + Math.sin(rad) * distDelta;
      const simSpeed = 14 + Math.round(Math.random() * 6);

      setActiveBearing(heading);
      setActiveSpeed(simSpeed);

      if (onSimulateMove) {
        onSimulateMove(nextLat, nextLng, heading, simSpeed);
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

  const compassData = getCompassDirection(activeBearing);
  const targetHistory = selectedUser ? trajectoryHistoryRef.current[selectedUser.uid] || [] : [];

  return (
    <div className="relative w-full h-full min-h-[380px] rounded-2xl overflow-hidden border border-slate-700/80 shadow-md bg-slate-950 flex flex-col">
      {/* Integrated Dedicated Header Toolbar - Guaranteed Zero Overlaps & Smooth Responsive Scroll */}
      <div className="bg-slate-900/95 border-b border-slate-800 px-3 py-2 flex items-center justify-between gap-2 overflow-x-auto no-scrollbar z-20 flex-shrink-0">
        {/* Left Status Group */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-950 text-white rounded-xl border border-slate-800 text-xs font-semibold shadow-inner">
            <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span className="hidden sm:inline">GPS Tracking Grid</span>
            <span className="text-[10px] px-1.5 py-0.5 bg-emerald-950 text-emerald-300 rounded font-mono border border-emerald-800">
              {locationSource.toUpperCase()}
            </span>
          </div>

          <button
            onClick={() => setAutoFollow(!autoFollow)}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold transition shadow-sm border cursor-pointer flex-shrink-0 ${
              autoFollow
                ? "bg-indigo-600 text-white border-indigo-500 shadow-indigo-500/20"
                : "bg-slate-800/90 text-slate-300 border-slate-700 hover:text-white"
            }`}
            title="Automatically keep camera centered on position"
          >
            <Crosshair className={`w-3.5 h-3.5 ${autoFollow ? "animate-spin" : ""}`} />
            <span>Follow: {autoFollow ? "ON" : "OFF"}</span>
          </button>
        </div>

        {/* Right Map Actions Group */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {/* Map Layer Switcher (Street vs Satellite) */}
          <button
            onClick={() => setMapLayer(mapLayer === "standard" ? "satellite" : "standard")}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold transition border bg-slate-800/90 text-slate-200 border-slate-700 hover:text-white cursor-pointer flex-shrink-0"
            title="Toggle Satellite Imagery / Standard Map"
          >
            <Layers className="w-3.5 h-3.5 text-blue-400" />
            <span>{mapLayer === "standard" ? "Satellite" : "Street"}</span>
          </button>

          {/* Scroll Zoom Toggle */}
          <button
            onClick={() => setScrollZoomEnabled(!scrollZoomEnabled)}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold transition border cursor-pointer flex-shrink-0 ${
              scrollZoomEnabled
                ? "bg-amber-600 text-white border-amber-500 shadow-amber-500/20"
                : "bg-slate-800/90 text-slate-300 border-slate-700 hover:text-white"
            }`}
            title="Toggle whether mouse scroll zooms the map or scrolls the page smoothly"
          >
            <MousePointer className="w-3.5 h-3.5" />
            <span>Scroll: {scrollZoomEnabled ? "ON" : "OFF"}</span>
          </button>

          {/* Recenter Button */}
          <button
            onClick={handleRecenterOnMe}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold transition border bg-blue-600 hover:bg-blue-500 text-white border-blue-500 cursor-pointer shadow-sm shadow-blue-500/20 flex-shrink-0"
            title="Center map on my current real coordinates"
          >
            <Crosshair className="w-3.5 h-3.5" />
            <span>Center Me</span>
          </button>

          {/* Fit all targets button (Admin mode) */}
          {users.length > 1 && (
            <button
              onClick={handleFitAllBounds}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold transition border bg-slate-800/90 text-slate-300 border-slate-700 hover:text-white cursor-pointer flex-shrink-0"
              title="Fit all tracked devices into view"
            >
              <Maximize2 className="w-3.5 h-3.5 text-indigo-400" />
              <span>Fit All</span>
            </button>
          )}

          {/* Trail Toggle */}
          <button
            onClick={() => setShowTrails(!showTrails)}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold transition border cursor-pointer flex-shrink-0 ${
              showTrails
                ? "bg-indigo-950 text-indigo-300 border-indigo-800"
                : "bg-slate-800/90 text-slate-400 border-slate-700 hover:text-white"
            }`}
            title="Toggle movement breadcrumb trajectory path"
          >
            <Footprints className="w-3.5 h-3.5" />
            <span>Trails: {showTrails ? "ON" : "OFF"}</span>
          </button>
        </div>
      </div>

      {/* Main Leaflet Canvas Element */}
      <div id="leaflet-map-element" ref={containerRef} className="w-full flex-1 min-h-[300px] z-10" />

      {/* Bottom Live Target Telemetry & Direction HUD (Opens when a citizen is selected in Admin) */}
      {selectedUser && selectedUser.lastLocation && (
        <div className="absolute bottom-3 left-3 right-3 z-[1000] bg-slate-900/95 border border-slate-800/90 rounded-2xl p-3.5 shadow-2xl backdrop-blur-xl text-white">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
            {/* Target Identity & Info */}
            <div className="flex items-center gap-3">
              <div className="relative w-12 h-12 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-center shadow-inner flex-shrink-0">
                <div
                  className="transition-transform duration-500 flex items-center justify-center"
                  style={{ transform: `rotate(${activeBearing}deg)` }}
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
              <div className="bg-slate-950/80 border border-slate-800/80 px-3 py-1.5 rounded-xl flex items-center gap-2 flex-1 md:flex-initial">
                <Navigation className="w-4 h-4 text-indigo-400" />
                <div>
                  <div className="text-[10px] text-slate-400 font-mono uppercase">Heading</div>
                  <div className="text-xs font-bold text-slate-100 font-mono">
                    {activeBearing}° {compassData.label} {compassData.arrow}
                  </div>
                </div>
              </div>

              <div className="bg-slate-950/80 border border-slate-800/80 px-3 py-1.5 rounded-xl flex items-center gap-2 flex-1 md:flex-initial">
                <Activity className="w-4 h-4 text-emerald-400" />
                <div>
                  <div className="text-[10px] text-slate-400 font-mono uppercase">Speed</div>
                  <div className="text-xs font-bold text-slate-100 font-mono">
                    {activeSpeed > 0 ? `${activeSpeed} km/h` : "Stationary (0 km/h)"}
                  </div>
                </div>
              </div>

              <div className="bg-slate-950/80 border border-slate-800/80 px-3 py-1.5 rounded-xl hidden sm:flex items-center gap-2">
                <Footprints className="w-4 h-4 text-amber-400" />
                <div>
                  <div className="text-[10px] text-slate-400 font-mono uppercase">Live Trajectory</div>
                  <div className="text-xs font-bold text-slate-100 font-mono">
                    {targetHistory.length} Fixes
                  </div>
                </div>
              </div>

              <a
                href={`tel:${selectedUser.phone}`}
                className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition shadow flex items-center gap-1.5 cursor-pointer"
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
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition border border-slate-700 flex items-center gap-1 cursor-pointer"
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
