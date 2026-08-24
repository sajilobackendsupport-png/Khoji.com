import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import { SiteConfig, NepalEmergencyContact } from "../types";
import { NEPAL_EMERGENCY_CONTACTS } from "./nepalContacts";

const STORAGE_KEY = "khoji_site_config_v1";

export const DEFAULT_SITE_CONFIG: SiteConfig = {
  siteTitle: "Khoji Nepal",
  siteTagline: "Emergency SOS Dispatch & Live Citizen Tracking Network",
  brandLogoText: "Khoji.com",
  badgeText: "Nepal Command",
  themeColor: "red",
  organizationName: "Government of Nepal - National Emergency Response Center",
  footerNotice: "Official Emergency Response Portal • Monitored 24/7 by Nepal Police & Rapid Response Rescue",
  
  // Emergency Broadcast Banner
  bannerEnabled: false,
  bannerText: "⚠️ WEATHER ADVISORY: Heavy rainfall alert across Central & Eastern Nepal. Check road conditions before traveling.",
  bannerType: "warning",
  bannerActionText: "View Emergency Contacts",
  bannerActionLink: "#emergency-contacts",

  // Contacts
  contacts: NEPAL_EMERGENCY_CONTACTS.map((c, i) => ({
    ...c,
    id: `contact-${i + 1}`,
    enabled: true,
    category: i < 3 ? "national" : i === 3 ? "disaster" : i === 4 ? "local" : "hospital",
    icon: i === 0 ? "police" : i === 1 ? "fire" : i === 2 ? "ambulance" : i === 3 ? "disaster" : i === 4 ? "police" : "hospital",
  })),

  // Map settings
  defaultMapCenter: {
    lat: 27.7172,
    lng: 85.324,
  },
  defaultMapZoom: 12,
  mapTheme: "standard",
  quickRegions: [
    {
      id: "ktm",
      name: "Kathmandu Valley",
      lat: 27.7172,
      lng: 85.324,
      zoom: 12,
      description: "Capital city region, Lalitpur, and Bhaktapur",
    },
    {
      id: "pkr",
      name: "Pokhara / Gandaki",
      lat: 28.2096,
      lng: 83.9856,
      zoom: 13,
      description: "Lakeside tourism hub & Annapurna circuit gateway",
    },
    {
      id: "chitwan",
      name: "Chitwan / Narayangarh",
      lat: 27.6833,
      lng: 84.4333,
      zoom: 13,
      description: "Terai highway corridor & wildlife reserve zone",
    },
    {
      id: "everest",
      name: "Everest / Lukla Base",
      lat: 27.6888,
      lng: 86.7314,
      zoom: 12,
      description: "Himalayan search and rescue station",
    },
    {
      id: "butwal",
      name: "Butwal / Lumbini",
      lat: 27.7,
      lng: 83.45,
      zoom: 13,
      description: "Western trade gateway and pilgrimage hub",
    },
  ],

  // SOS protocols
  sosProtocols: {
    police: "Stay in a secure location if possible. Keep your phone line clear for dispatcher callbacks. Broadcast your live coordinates.",
    fire: "Evacuate immediately via designated exits. Do not use elevators. Alert neighbors while keeping phone active for rescue guidance.",
    ambulance: "Do not move severely injured patients unless in immediate danger. Apply direct pressure to bleeding wounds and prepare clear road access.",
    lost: "Remain in your current place if safe. Turn on device location tracking. Save battery by dimming display and waiting for search team call.",
  },

  // Crisis Safety Guides
  crisisGuides: [
    {
      id: "earthquake",
      title: "Earthquake Safety Protocol (Drop, Cover, Hold)",
      category: "Natural Disaster",
      summary: "Immediate survival procedures during tremors across seismic zones.",
      steps: [
        "Drop to your hands and knees to prevent being knocked over.",
        "Take cover under sturdy furniture (heavy table, desk) or against an interior wall.",
        "Hold on to your shelter until shaking stops. Protect your head and neck with your arms.",
        "After tremors cease, check for gas leaks, electrical damage, and evacuate to open ground if in high-risk masonry.",
      ],
      helpline: "1155 (NDRRMA)",
    },
    {
      id: "landslide",
      title: "Flash Flood & Landslide Mountain Advisory",
      category: "Monsoon Hazard",
      summary: "Crucial emergency response for heavy mountain rainfall and slope failure.",
      steps: [
        "Listen for unusual sounds like trees cracking or boulders knocking together.",
        "Move quickly away from the path of the landslide or debris flow to stable high ground.",
        "Avoid river valleys and low-lying riverbeds during continuous monsoon downpours.",
        "Never attempt to drive or walk through fast-moving flood waters.",
      ],
      helpline: "1114 (APF Rescue)",
    },
    {
      id: "trekking",
      title: "High Altitude & Mountain Trekker Emergency",
      category: "Wilderness",
      summary: "Emergency procedures for lost hikers, severe hypothermia, and AMS in Himalayas.",
      steps: [
        "Descend immediately to lower altitude if experiencing severe headache, nausea, or ataxia.",
        "Stay on marked trails; do not attempt shortcuts across glaciers or scree slopes.",
        "Deploy satellite or cellular SOS with exact GPS coordinates via Khoji.",
        "Seek immediate shelter from wind/blizzard conditions and stay warm with thermal blankets.",
      ],
      helpline: "100 (Police Rescue) / 102 (Ambulance)",
    },
  ],

  // Feature Flags
  features: {
    enableAudioSiren: true,
    enableDesktopNotifications: true,
    enableMultiDeviceTracking: true,
    enablePublicGuestSOS: true,
  },

  updatedAt: new Date().toISOString(),
  updatedBy: "System Default",
};

/**
 * Retrieve local cached config or fallback to defaults
 */
export function getSiteConfigLocal(): SiteConfig {
  if (typeof window === "undefined") return DEFAULT_SITE_CONFIG;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_SITE_CONFIG, ...parsed };
    }
  } catch (e) {
    console.warn("Failed to load local site config:", e);
  }
  return DEFAULT_SITE_CONFIG;
}

/**
 * Listen to real-time updates from Firebase Firestore for the site configuration
 */
export function subscribeSiteConfig(
  onUpdate: (config: SiteConfig) => void
): () => void {
  // Immediately supply local/default
  const local = getSiteConfigLocal();
  onUpdate(local);

  try {
    const configDocRef = doc(db, "app_config", "site_settings");
    const unsubscribe = onSnapshot(
      configDocRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const remoteData = snapshot.data() as Partial<SiteConfig>;
          const merged: SiteConfig = {
            ...DEFAULT_SITE_CONFIG,
            ...remoteData,
            contacts: remoteData.contacts || DEFAULT_SITE_CONFIG.contacts,
            quickRegions: remoteData.quickRegions || DEFAULT_SITE_CONFIG.quickRegions,
            crisisGuides: remoteData.crisisGuides || DEFAULT_SITE_CONFIG.crisisGuides,
            sosProtocols: {
              ...DEFAULT_SITE_CONFIG.sosProtocols,
              ...(remoteData.sosProtocols || {}),
            },
            features: {
              ...DEFAULT_SITE_CONFIG.features,
              ...(remoteData.features || {}),
            },
          };
          // Cache locally
          localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
          onUpdate(merged);
        } else {
          // If Firestore document doesn't exist yet, bootstrap it with defaults
          saveSiteConfigToFirebase(DEFAULT_SITE_CONFIG, "Initial Setup").catch(() => {});
        }
      },
      (err) => {
        console.warn("Real-time site config listener notice:", err);
        // Ensure local config is active
        onUpdate(getSiteConfigLocal());
      }
    );

    return unsubscribe;
  } catch (error) {
    console.warn("Site config listener initialization notice:", error);
    return () => {};
  }
}

/**
 * Save customized website configuration to Firebase Firestore and local cache
 */
export async function saveSiteConfigToFirebase(
  config: SiteConfig,
  updatedBy: string = "Admin Dispatcher"
): Promise<void> {
  const payload: SiteConfig = {
    ...config,
    updatedAt: new Date().toISOString(),
    updatedBy,
  };

  // Cache locally right away for zero-latency UI update
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));

  try {
    const configDocRef = doc(db, "app_config", "site_settings");
    await setDoc(configDocRef, payload, { merge: true });
  } catch (err: any) {
    console.warn("Firebase save site config notice:", err);
    throw err;
  }
}

/**
 * Reset website configuration back to default values
 */
export async function resetSiteConfigToDefault(
  updatedBy: string = "Admin Reset"
): Promise<SiteConfig> {
  const resetConfig: SiteConfig = {
    ...DEFAULT_SITE_CONFIG,
    updatedAt: new Date().toISOString(),
    updatedBy,
  };

  await saveSiteConfigToFirebase(resetConfig, updatedBy);
  return resetConfig;
}
