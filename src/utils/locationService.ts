/**
 * Real-Time Location & Geolocation Service for Khoji.com
 * Handles High-Accuracy GPS, continuous hardware watching, IP-based fallback, and reverse geocoding.
 */

export interface RealLocationResult {
  lat: number;
  lng: number;
  accuracy: number;
  heading: number;
  speed: number;
  altitude?: number;
  source: "gps-high" | "gps-low" | "ip" | "cached";
  timestamp: string;
  address?: string;
}

// In-memory cache for reverse geocoding to avoid repetitive requests
const geocodeCache: { [key: string]: { address: string; time: number } } = {};

/**
 * Reverse geocodes lat/lng into a readable place name using OpenStreetMap Nominatim
 */
export async function reverseGeocodeLocation(lat: number, lng: number): Promise<string> {
  const cacheKey = `${lat.toFixed(4)},${lng.toFixed(4)}`;
  const now = Date.now();
  if (geocodeCache[cacheKey] && now - geocodeCache[cacheKey].time < 300000) {
    return geocodeCache[cacheKey].address;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=16&addressdetails=1`,
      {
        signal: controller.signal,
        headers: {
          "Accept-Language": "en,ne",
        },
      }
    );
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data && data.display_name) {
        // Construct clean short address
        const addr = data.address || {};
        const parts: string[] = [];
        if (addr.road || addr.suburb || addr.neighbourhood) {
          parts.push(addr.road || addr.suburb || addr.neighbourhood);
        }
        if (addr.city || addr.town || addr.municipality || addr.village || addr.county) {
          parts.push(addr.city || addr.town || addr.municipality || addr.village || addr.county);
        }
        if (addr.state || addr.province) {
          parts.push(addr.state || addr.province);
        }
        if (addr.country) {
          parts.push(addr.country);
        }

        const formatted = parts.length > 0 ? parts.join(", ") : data.display_name.split(",").slice(0, 3).join(",");
        geocodeCache[cacheKey] = { address: formatted, time: now };
        return formatted;
      }
    }
  } catch (err) {
    // Non-blocking error
    console.debug("Reverse geocode notice:", err);
  }

  return `${lat.toFixed(4)}°, ${lng.toFixed(4)}°`;
}

/**
 * Fallback to IP-based location if device GPS is completely disabled, blocked, or in a restricted iframe
 */
async function fetchIpLocation(): Promise<RealLocationResult | null> {
  // Try reliable public IP endpoints
  const endpoints = [
    {
      url: "https://ipapi.co/json/",
      parse: (d: any) => ({
        lat: Number(d.latitude),
        lng: Number(d.longitude),
        city: d.city,
        region: d.region,
        country: d.country_name,
      }),
    },
    {
      url: "https://ipwho.is/",
      parse: (d: any) => ({
        lat: Number(d.latitude),
        lng: Number(d.longitude),
        city: d.city,
        region: d.region,
        country: d.country,
      }),
    },
    {
      url: "https://freeipapi.com/api/json",
      parse: (d: any) => ({
        lat: Number(d.latitude),
        lng: Number(d.longitude),
        city: d.cityName,
        region: d.regionName,
        country: d.countryName,
      }),
    },
  ];

  for (const ep of endpoints) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);
      const res = await fetch(ep.url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (res.ok) {
        const raw = await res.json();
        const parsed = ep.parse(raw);
        if (parsed.lat && parsed.lng && !isNaN(parsed.lat) && !isNaN(parsed.lng)) {
          const address = [parsed.city, parsed.region, parsed.country].filter(Boolean).join(", ");
          return {
            lat: parsed.lat,
            lng: parsed.lng,
            accuracy: 2500, // IP accuracy is city-level (~2.5km)
            heading: 0,
            speed: 0,
            source: "ip",
            timestamp: new Date().toISOString(),
            address: address || undefined,
          };
        }
      }
    } catch {
      // try next endpoint
    }
  }

  return null;
}

/**
 * Acquires current real location from device GPS with high accuracy,
 * falling back gracefully to standard accuracy and then IP lookup.
 */
export async function getRealLocation(): Promise<RealLocationResult> {
  if (typeof window === "undefined" || !navigator.geolocation) {
    const ipLoc = await fetchIpLocation();
    if (ipLoc) return ipLoc;
    return {
      lat: 27.7172,
      lng: 85.324,
      accuracy: 50,
      heading: 0,
      speed: 0,
      source: "cached",
      timestamp: new Date().toISOString(),
      address: "Kathmandu, Nepal",
    };
  }

  // 1. First attempt: High Accuracy GPS (e.g. mobile GPS / WiFi triangulated)
  try {
    const highAccPos = await new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 6000,
        maximumAge: 1000,
      });
    });

    const lat = highAccPos.coords.latitude;
    const lng = highAccPos.coords.longitude;
    const heading = highAccPos.coords.heading !== null && !isNaN(highAccPos.coords.heading) ? Math.round(highAccPos.coords.heading) : 0;
    const speed = highAccPos.coords.speed !== null && !isNaN(highAccPos.coords.speed) ? Math.round(highAccPos.coords.speed * 3.6) : 0;
    const accuracy = Math.round(highAccPos.coords.accuracy || 15);
    const altitude = highAccPos.coords.altitude !== null ? Math.round(highAccPos.coords.altitude) : undefined;

    const address = await reverseGeocodeLocation(lat, lng);

    return {
      lat,
      lng,
      accuracy,
      heading,
      speed,
      altitude,
      source: "gps-high",
      timestamp: new Date().toISOString(),
      address,
    };
  } catch (highErr: any) {
    console.debug("High accuracy GPS attempt completed:", highErr?.message || highErr);

    // 2. Second attempt: Standard Accuracy (faster, less strict on satellite lock)
    try {
      const lowAccPos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: false,
          timeout: 5000,
          maximumAge: 10000,
        });
      });

      const lat = lowAccPos.coords.latitude;
      const lng = lowAccPos.coords.longitude;
      const heading = lowAccPos.coords.heading !== null && !isNaN(lowAccPos.coords.heading) ? Math.round(lowAccPos.coords.heading) : 0;
      const speed = lowAccPos.coords.speed !== null && !isNaN(lowAccPos.coords.speed) ? Math.round(lowAccPos.coords.speed * 3.6) : 0;
      const accuracy = Math.round(lowAccPos.coords.accuracy || 60);

      const address = await reverseGeocodeLocation(lat, lng);

      return {
        lat,
        lng,
        accuracy,
        heading,
        speed,
        source: "gps-low",
        timestamp: new Date().toISOString(),
        address,
      };
    } catch (lowErr: any) {
      console.warn("Standard accuracy GPS attempt failed:", lowErr?.message || lowErr);

      // 3. Third attempt: IP-based real geocoding
      const ipLoc = await fetchIpLocation();
      if (ipLoc) return ipLoc;

      // 4. Default fallback: Kathmandu default
      return {
        lat: 27.7172,
        lng: 85.324,
        accuracy: 100,
        heading: 0,
        speed: 0,
        source: "cached",
        timestamp: new Date().toISOString(),
        address: "Kathmandu, Nepal",
      };
    }
  }
}

/**
 * Starts continuous live hardware watch on device GPS coordinates and movement
 */
export function watchRealLocation(
  onLocation: (res: RealLocationResult) => void,
  onError?: (err: GeolocationPositionError) => void
): () => void {
  if (typeof window === "undefined" || !navigator.geolocation) {
    return () => {};
  }

  let lastLat = 0;
  let lastLng = 0;

  const watchId = navigator.geolocation.watchPosition(
    async (pos) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      const heading = pos.coords.heading !== null && !isNaN(pos.coords.heading) ? Math.round(pos.coords.heading) : 0;
      const speed = pos.coords.speed !== null && !isNaN(pos.coords.speed) ? Math.round(pos.coords.speed * 3.6) : 0;
      const accuracy = Math.round(pos.coords.accuracy || 20);
      const altitude = pos.coords.altitude !== null ? Math.round(pos.coords.altitude) : undefined;

      // Only reverse geocode if location changed significantly (> 50m)
      let address: string | undefined = undefined;
      if (Math.abs(lat - lastLat) > 0.0005 || Math.abs(lng - lastLng) > 0.0005) {
        lastLat = lat;
        lastLng = lng;
        address = await reverseGeocodeLocation(lat, lng);
      }

      onLocation({
        lat,
        lng,
        accuracy,
        heading,
        speed,
        altitude,
        source: accuracy <= 35 ? "gps-high" : "gps-low",
        timestamp: new Date().toISOString(),
        address,
      });
    },
    (err) => {
      console.warn("GPS watch position notice:", err.message);
      if (onError) onError(err);
    },
    {
      enableHighAccuracy: true,
      maximumAge: 2000,
      timeout: 10000,
    }
  );

  return () => {
    if (typeof window !== "undefined" && navigator.geolocation && watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
    }
  };
}
