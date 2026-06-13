import { useEffect, useRef } from "react";
import L from "leaflet";
import { UserProfile, EmergencyAlert } from "../types";

interface TrackingMapProps {
  users?: UserProfile[];
  emergencies?: EmergencyAlert[];
  selectedUser?: UserProfile | null;
  selectedEmergency?: EmergencyAlert | null;
  onMapClick?: (lat: number, lng: number) => void;
  interactive?: boolean; // If true, clicking updates current user simulation location
  simulateLocation?: { lat: number; lng: number } | null;
}

export default function TrackingMap({
  users = [],
  emergencies = [],
  selectedUser = null,
  selectedEmergency = null,
  onMapClick,
  interactive = false,
  simulateLocation = null,
}: TrackingMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<{ [key: string]: L.Marker }>({});
  const circlesRef = useRef<{ [key: string]: L.Circle }>({});
  const simulateMarkerRef = useRef<L.Marker | null>(null);

  // Initialize Map
  useEffect(() => {
    if (!containerRef.current) return;

    // Kathmandu default coords: lat: 27.7172, lng: 85.3240
    const defaultLat = 27.7172;
    const defaultLng = 85.3240;

    const map = L.map(containerRef.current, {
      zoomControl: true,
      scrollWheelZoom: true,
    }).setView([defaultLat, defaultLng], 12);

    mapRef.current = map;

    // OpenStreetMap hot tile server or standard OSM
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    // Dynamic map interaction
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
  }, [interactive]);

  // Adjust center/zoom when selectedUser or selectedEmergency changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (selectedUser?.lastLocation) {
      const { lat, lng } = selectedUser.lastLocation;
      map.setView([lat, lng], 15, { animate: true, duration: 1 });
      
      // Delay slightly to allow the map pan animation to finish smoothly, then trigger popup
      setTimeout(() => {
        const m = markersRef.current[`user-${selectedUser.uid}`];
        if (m) {
          m.openPopup();
        }
      }, 300);
    } else if (selectedEmergency?.location) {
      const { lat, lng } = selectedEmergency.location;
      map.setView([lat, lng], 16, { animate: true, duration: 1 });
      
      setTimeout(() => {
        const m = markersRef.current[`emergency-${selectedEmergency.id}`];
        if (m) {
          m.openPopup();
        }
      }, 300);
    } else if (simulateLocation) {
      map.setView([simulateLocation.lat, simulateLocation.lng], 15, { animate: true, duration: 0.8 });
    }
  }, [selectedUser, selectedEmergency, simulateLocation]);

  // Sync users and emergency markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear old markers & circles
    (Object.values(markersRef.current) as L.Marker[]).forEach((marker) => marker.remove());
    (Object.values(circlesRef.current) as L.Circle[]).forEach((circle) => circle.remove());
    markersRef.current = {};
    circlesRef.current = {};

    // 1. Plot all users
    users.forEach((user) => {
      if (!user.lastLocation) return;
      const { lat, lng, accuracy } = user.lastLocation;

      // Select pin styling based on user's status
      let indicatorColor = "#3b82f6"; // blue (normal)
      let pulseClass = "bg-blue-500";
      let ringClass = "border-blue-400";
      
      if (user.status === "emergency") {
        indicatorColor = "#ef4444"; // red
        pulseClass = "bg-red-500 animate-ping";
        ringClass = "border-red-500";
      } else if (user.status === "lost") {
        indicatorColor = "#f59e0b"; // amber
        pulseClass = "bg-amber-500 animate-pulse";
        ringClass = "border-amber-500";
      }

      // Create Custom DivIcon (Tailwind-Ready Pin!)
      const customIcon = L.divIcon({
        className: "custom-leaflet-marker",
        iconSize: [36, 36],
        iconAnchor: [18, 18],
        html: `
          <div class="relative w-9 h-9 flex items-center justify-center">
            <!-- Ripple Wave -->
            <span class="absolute inline-flex h-full w-full rounded-full ${pulseClass} opacity-75"></span>
            <!-- Inner Glowing Circle -->
            <div class="relative flex items-center justify-center w-7 h-7 rounded-full bg-slate-900 border-2 ${ringClass} shadow-xl">
              <span class="font-bold text-[9px] text-white tracking-widest text-center">
                ${user.status === "emergency" ? "🚨" : user.status === "lost" ? "⚠️" : "👤"}
              </span>
            </div>
          </div>
        `,
      });

      // Marker Creation
      const marker = L.marker([lat, lng], { icon: customIcon }).addTo(map);
      
      // Popup binding with clean statistics
      marker.bindPopup(`
        <div class="p-1 min-w-44 leading-tight">
          <div class="flex items-center gap-1.5 mb-1 bg-slate-100 p-1 rounded">
            <span class="text-xs font-bold text-slate-800">${user.fullName}</span>
            <span class="text-[10px] ml-auto px-1 border rounded text-slate-500 uppercase font-mono">${user.status}</span>
          </div>
          <p class="text-[11px] text-slate-600 mb-0.5"><b>📧 Email:</b> ${user.email}</p>
          <p class="text-[11px] text-slate-600 mb-0.5"><b>📞 Phone:</b> ${user.phone}</p>
          <p class="text-[11px] text-slate-600 mb-1"><b>📍 Device status:</b> ${user.status.toUpperCase()}</p>
          <div class="text-[9px] text-slate-400 border-t pt-1 font-mono">Lat: ${lat.toFixed(5)}, Lng: ${lng.toFixed(5)}</div>
        </div>
      `);

      markersRef.current[`user-${user.uid}`] = marker;

      // Draw accuracy circle
      if (accuracy && accuracy > 0) {
        const circle = L.circle([lat, lng], {
          radius: accuracy,
          color: indicatorColor,
          fillColor: indicatorColor,
          fillOpacity: 0.12,
          weight: 1,
        }).addTo(map);
        circlesRef.current[`user-circle-${user.uid}`] = circle;
      }
    });

    // 2. Plot live emergencies separately with prominent icons
    emergencies.forEach((alert) => {
      if (alert.status !== "active") return;
      const { lat, lng } = alert.location;

      const dangerIcon = L.divIcon({
        className: "custom-leaflet-marker",
        iconSize: [42, 42],
        iconAnchor: [21, 21],
        html: `
          <div class="relative w-11 h-11 flex items-center justify-center">
            <!-- Pulsing emergency radar wave -->
            <span class="absolute inline-flex h-full w-full rounded-full bg-rose-600 animate-ping opacity-85"></span>
            
            <div class="relative flex items-center justify-center w-8 h-8 rounded-full bg-rose-600 text-white border-2 border-white shadow-2xl">
              <span class="text-xs font-semibold">🚨</span>
            </div>
            <!-- Indicator flag -->
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
            <span class="text-xs font-extrabold">🚨 IN EMERGENCY</span>
            <span class="text-[9px] ml-auto px-1 bg-rose-600 text-white rounded uppercase font-bold tracking-widest">${alert.type}</span>
          </div>
          <p class="text-[11px] text-slate-800 mb-0.5"><b>User:</b> ${alert.userName}</p>
          <p class="text-[11px] text-slate-800 mb-0.5"><b>Phone:</b> ${alert.userPhone}</p>
          <p class="text-[11px] text-slate-600 mb-1 bg-slate-50 p-1 text-[10px] rounded italic">"${alert.details || "No custom detail is provided."}"</p>
          <div class="text-[9px] text-slate-400 font-mono mt-1">Reported: ${new Date(alert.createdAt).toLocaleTimeString()}</div>
        </div>
      `);

      markersRef.current[`emergency-${alert.id}`] = marker;
    });

  }, [users, emergencies]);

  // 3. Keep simulated marker synced if interactive
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (simulateMarkerRef.current) {
      simulateMarkerRef.current.remove();
      simulateMarkerRef.current = null;
    }

    if (interactive && simulateLocation) {
      const simIcon = L.divIcon({
        className: "custom-leaflet-marker",
        iconSize: [32, 32],
        iconAnchor: [16, 16],
        html: `
          <div class="relative w-8 h-8 flex items-center justify-center">
            <span class="absolute inline-flex h-full w-full rounded-full bg-indigo-400 animate-ping opacity-60"></span>
            <div class="relative flex items-center justify-center w-6 h-6 rounded-full bg-indigo-600 text-white border-2 border-white shadow-lg">
              <span class="text-[10px]">📍</span>
            </div>
          </div>
        `,
      });

      simulateMarkerRef.current = L.marker([simulateLocation.lat, simulateLocation.lng], {
        icon: simIcon,
        draggable: true,
      }).addTo(map);

      simulateMarkerRef.current.bindPopup(`
        <div class="p-1 text-center">
          <p class="text-xs font-bold text-slate-800 mb-0.5">Your Position (Simulated)</p>
          <p class="text-[10px] text-slate-500 mb-0">Drag this pin to update your real-time simulated location</p>
        </div>
      `).openPopup();

      // Trigger location updates when dragging finishes
      simulateMarkerRef.current.on("dragend", (e: any) => {
        const position = e.target.getLatLng();
        if (onMapClick) {
          onMapClick(position.lat, position.lng);
        }
      });
    }
  }, [interactive, simulateLocation, onMapClick]);

  return (
    <div className="relative w-full h-full rounded-2xl overflow-hidden border border-slate-100 shadow-sm bg-slate-50">
      {/* Floating map hint */}
      {interactive && (
        <div className="absolute top-3 left-12 z-[1000] bg-indigo-600 text-white text-[11px] font-medium px-3 py-1.5 rounded-full shadow-md backdrop-blur-sm bg-opacity-95 pointer-events-none uppercase tracking-wide">
          Map Ready • Click anywhere or Drag pin to simulate location updates
        </div>
      )}
      <div id="leaflet-map-element" ref={containerRef} className="w-full h-full z-10" />
    </div>
  );
}
