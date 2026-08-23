/**
 * Geolocation and Heading Utilities for Live Citizen Tracking
 */

/**
 * Calculates the forward azimuth / bearing between two geographic coordinates in degrees (0 - 360).
 * 0° = North, 90° = East, 180° = South, 270° = West
 */
export function calculateBearing(
  startLat: number,
  startLng: number,
  destLat: number,
  destLng: number
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const toDeg = (rad: number) => (rad * 180) / Math.PI;

  const φ1 = toRad(startLat);
  const φ2 = toRad(destLat);
  const Δλ = toRad(destLng - startLng);

  // If coordinates are virtually identical, return 0
  if (Math.abs(startLat - destLat) < 0.000001 && Math.abs(startLng - destLng) < 0.000001) {
    return 0;
  }

  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x =
    Math.cos(φ1) * Math.sin(φ2) -
    Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);

  let θ = Math.atan2(y, x);
  let bearing = (toDeg(θ) + 360) % 360;

  return Math.round(bearing);
}

/**
 * Returns human-readable compass cardinal directions with visual arrow
 */
export function getCompassDirection(bearing: number): {
  code: string;
  label: string;
  arrow: string;
} {
  const normalized = (bearing % 360 + 360) % 360;
  const directions = [
    { code: "N", label: "North", arrow: "↑", min: 348.75, max: 11.25 },
    { code: "NNE", label: "North-Northeast", arrow: "↗", min: 11.25, max: 33.75 },
    { code: "NE", label: "Northeast", arrow: "↗", min: 33.75, max: 56.25 },
    { code: "ENE", label: "East-Northeast", arrow: "↗", min: 56.25, max: 78.75 },
    { code: "E", label: "East", arrow: "→", min: 78.75, max: 101.25 },
    { code: "ESE", label: "East-Southeast", arrow: "↘", min: 101.25, max: 123.75 },
    { code: "SE", label: "Southeast", arrow: "↘", min: 123.75, max: 146.25 },
    { code: "SSE", label: "South-Southeast", arrow: "↘", min: 146.25, max: 168.75 },
    { code: "S", label: "South", arrow: "↓", min: 168.75, max: 191.25 },
    { code: "SSW", label: "South-Southwest", arrow: "↙", min: 191.25, max: 213.75 },
    { code: "SW", label: "Southwest", arrow: "↙", min: 213.75, max: 236.25 },
    { code: "WSW", label: "West-Southwest", arrow: "↙", min: 236.25, max: 258.75 },
    { code: "W", label: "West", arrow: "←", min: 258.75, max: 281.25 },
    { code: "WNW", label: "West-Northwest", arrow: "↖", min: 281.25, max: 303.75 },
    { code: "NW", label: "Northwest", arrow: "↖", min: 303.75, max: 326.25 },
    { code: "NNW", label: "North-Northwest", arrow: "↖", min: 326.25, max: 348.75 },
  ];

  for (const d of directions) {
    if (d.code === "N") {
      if (normalized >= d.min || normalized < d.max) {
        return { code: d.code, label: d.label, arrow: d.arrow };
      }
    } else if (normalized >= d.min && normalized < d.max) {
      return { code: d.code, label: d.label, arrow: d.arrow };
    }
  }

  return { code: "N", label: "North", arrow: "↑" };
}

/**
 * Calculates distance between two points in meters using Haversine formula
 */
export function calculateDistanceMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371e3; // Earth radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const φ1 = toRad(lat1);
  const φ2 = toRad(lat2);
  const Δφ = toRad(lat2 - lat1);
  const Δλ = toRad(lng2 - lng1);

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

/**
 * Estimates speed in km/h between two coordinate updates
 */
export function estimateSpeedKmH(
  lat1: number,
  lng1: number,
  time1: string | number,
  lat2: number,
  lng2: number,
  time2: string | number
): number {
  const dist = calculateDistanceMeters(lat1, lng1, lat2, lng2);
  const t1 = typeof time1 === "string" ? new Date(time1).getTime() : time1;
  const t2 = typeof time2 === "string" ? new Date(time2).getTime() : time2;
  const seconds = Math.abs(t2 - t1) / 1000;

  if (seconds <= 0 || isNaN(seconds)) return 0;

  const mPerSec = dist / seconds;
  const kmPerHr = mPerSec * 3.6;

  return Math.min(Math.round(kmPerHr * 10) / 10, 180); // Cap at realistic ground speed
}

/**
 * Formats coordinates for neat display
 */
export function formatCoordinates(lat: number, lng: number): string {
  const latDir = lat >= 0 ? "N" : "S";
  const lngDir = lng >= 0 ? "E" : "W";
  return `${Math.abs(lat).toFixed(5)}° ${latDir}, ${Math.abs(lng).toFixed(5)}° ${lngDir}`;
}
