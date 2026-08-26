export interface EmergencyTriageResult {
  category: "medical" | "police" | "fire" | "traffic" | "disaster" | "women_child" | "lost_device" | "general";
  categoryLabel: string;
  primaryAuthority: string;
  primaryPhone: string;
  secondaryAuthority?: string;
  secondaryPhone?: string;
  urgency: "CRITICAL" | "HIGH" | "ELEVATED" | "STANDARD";
  detectedReason: string;
  recommendedAction: string;
  color: string;
  bgGradient: string;
  accentBorder: string;
}

/**
 * Intelligent Emergency Triage Engine for Nepal Emergency Dispatch (Khoji.com)
 * Automatically scans emergency types, user distress notes, user profiles, and keywords
 * to identify the appropriate authority and route emergency phone calls instantly.
 */
export function identifyEmergencyAndTarget(
  alert: {
    type?: string;
    details?: string;
    userName?: string;
    userPhone?: string;
    location?: { lat: number; lng: number };
  },
  customContacts?: Array<{ name: string; number: string; category?: string; description?: string }>
): EmergencyTriageResult {
  const type = (alert.type || "").toLowerCase().trim();
  const text = `${alert.type || ""} ${alert.details || ""} ${alert.userName || ""}`.toLowerCase();

  // 1. FIRE & EXPLOSION EMERGENCY
  if (
    type === "fire" ||
    text.includes("fire") ||
    text.includes("aago") ||
    text.includes("blaze") ||
    text.includes("smoke") ||
    text.includes("gas leak") ||
    text.includes("explosion") ||
    text.includes("cylinder") ||
    text.includes("dhwan")
  ) {
    return {
      category: "fire",
      categoryLabel: "Fire & Combustion Rescue",
      primaryAuthority: "Nepal Fire Brigade (Juddha Barun Yantra)",
      primaryPhone: "101",
      secondaryAuthority: "Kathmandu Valley Central Fire Control",
      secondaryPhone: "01-4221111",
      urgency: "CRITICAL",
      detectedReason: "Fire, smoke, or gas hazard detected in distress telemetry.",
      recommendedAction: "Dispatch nearest fire engine unit & evacuate building immediately.",
      color: "#ef4444",
      bgGradient: "from-red-600 via-orange-600 to-amber-700",
      accentBorder: "border-red-500",
    };
  }

  // 2. MEDICAL, AMBULANCE & INJURY EMERGENCY
  if (
    type === "ambulance" ||
    text.includes("ambulance") ||
    text.includes("medical") ||
    text.includes("hospital") ||
    text.includes("injury") ||
    text.includes("bleeding") ||
    text.includes("blood") ||
    text.includes("heart") ||
    text.includes("attack") ||
    text.includes("stroke") ||
    text.includes("breath") ||
    text.includes("unconscious") ||
    text.includes("pregnant") ||
    text.includes("delivery") ||
    text.includes("doctor") ||
    text.includes("chot") ||
    text.includes("birami") ||
    text.includes("poison") ||
    text.includes("snake")
  ) {
    return {
      category: "medical",
      categoryLabel: "Medical & Life-Support Trauma",
      primaryAuthority: "Nepal Ambulance Service (NAS)",
      primaryPhone: "102",
      secondaryAuthority: "Nepal Red Cross Blood & Rescue",
      secondaryPhone: "1130",
      urgency: "CRITICAL",
      detectedReason: "Critical medical condition, acute injury, or life-support distress.",
      recommendedAction: "Dispatch GPS-tracked ALS ambulance & prep emergency ER trauma bed.",
      color: "#f43f5e",
      bgGradient: "from-rose-600 via-red-600 to-pink-700",
      accentBorder: "border-rose-500",
    };
  }

  // 3. TRAFFIC & ROAD ACCIDENT EMERGENCY
  if (
    text.includes("traffic") ||
    text.includes("accident") ||
    text.includes("crash") ||
    text.includes("vehicle") ||
    text.includes("bike") ||
    text.includes("car") ||
    text.includes("truck") ||
    text.includes("highway") ||
    text.includes("overturn") ||
    text.includes("collision") ||
    text.includes("durghatana")
  ) {
    return {
      category: "traffic",
      categoryLabel: "Traffic & Roadway Collision",
      primaryAuthority: "Metropolitan Traffic Police Emergency",
      primaryPhone: "103",
      secondaryAuthority: "Traffic Control Center Hotline",
      secondaryPhone: "104",
      urgency: "HIGH",
      detectedReason: "Road accident, vehicle collision, or traffic obstruction reported.",
      recommendedAction: "Route highway patrol unit & coordinate clearance and trauma transport.",
      color: "#f59e0b",
      bgGradient: "from-amber-600 via-orange-600 to-red-600",
      accentBorder: "border-amber-500",
    };
  }

  // 4. NATURAL DISASTER, FLOOD, LANDSLIDE & SEARCH-AND-RESCUE
  if (
    text.includes("flood") ||
    text.includes("landslide") ||
    text.includes("pahiro") ||
    text.includes("baadhi") ||
    text.includes("earthquake") ||
    text.includes("bhuikampa") ||
    text.includes("river") ||
    text.includes("trapped") ||
    text.includes("avalanche") ||
    text.includes("disaster")
  ) {
    return {
      category: "disaster",
      categoryLabel: "National Disaster & Rescue Operation",
      primaryAuthority: "National Emergency Operation Centre (NEOC)",
      primaryPhone: "1155",
      secondaryAuthority: "Armed Police Force Disaster Response Base",
      secondaryPhone: "1114",
      urgency: "CRITICAL",
      detectedReason: "Natural disaster, flash flood, or structural entrapment incident.",
      recommendedAction: "Alert NEOC commander, APF search-and-rescue team, and local district DAO.",
      color: "#8b5cf6",
      bgGradient: "from-purple-600 via-indigo-600 to-blue-700",
      accentBorder: "border-purple-500",
    };
  }

  // 5. WOMEN & CHILDREN DISTRESS HELPLINE
  if (
    text.includes("child") ||
    text.includes("kid") ||
    text.includes("minor") ||
    text.includes("balika") ||
    text.includes("harass") ||
    text.includes("abuse") ||
    text.includes("domestic") ||
    text.includes("woman") ||
    text.includes("mahila") ||
    text.includes("rape") ||
    text.includes("stalk")
  ) {
    return {
      category: "women_child",
      categoryLabel: "Child & Women Protection Unit",
      primaryAuthority: "National Child Helpline Nepal",
      primaryPhone: "1098",
      secondaryAuthority: "National Women Commission Helpline",
      secondaryPhone: "1145",
      urgency: "HIGH",
      detectedReason: "Child protection or gender-based distress indicators found.",
      recommendedAction: "Deploy specialized women/child cell officers and counseling unit.",
      color: "#ec4899",
      bgGradient: "from-pink-600 via-rose-600 to-indigo-700",
      accentBorder: "border-pink-500",
    };
  }

  // 6. LOST DEVICE / MISSING CITIZEN
  if (
    type === "lost" ||
    text.includes("lost") ||
    text.includes("harayo") ||
    text.includes("stolen") ||
    text.includes("chori") ||
    text.includes("missing") ||
    text.includes("device") ||
    text.includes("imei")
  ) {
    return {
      category: "lost_device",
      categoryLabel: "Lost Device & Missing Asset Tracking",
      primaryAuthority: "Nepal Police Crime Investigation / Lost Cell Division",
      primaryPhone: "100",
      secondaryAuthority: "Kathmandu Valley Police Lost Property Cell",
      secondaryPhone: "01-4226998",
      urgency: "ELEVATED",
      detectedReason: "Device lost/stolen or missing citizen tracking flag.",
      recommendedAction: "Lock GPS coordinates, ping location beacon, and register IMEI with Police Cell.",
      color: "#3b82f6",
      bgGradient: "from-blue-600 via-indigo-600 to-slate-800",
      accentBorder: "border-blue-500",
    };
  }

  // 7. DEFAULT: CRIME, POLICE & RAPID SECURITY INTERVENTION
  return {
    category: "police",
    categoryLabel: "Police Rapid Emergency & Law Enforcement",
    primaryAuthority: "Nepal Police Emergency Central Dispatch",
    primaryPhone: "100",
    secondaryAuthority: "Armed Police Force (APF) Rapid Control",
    secondaryPhone: "1114",
    urgency: "CRITICAL",
    detectedReason: "Direct citizen emergency SOS flagged. Rapid law enforcement response required.",
    recommendedAction: "Dispatch nearest sector patrol squad with live GPS tracking vectors.",
    color: "#dc2626",
    bgGradient: "from-red-700 via-slate-900 to-slate-950",
    accentBorder: "border-red-600",
  };
}

/**
 * Standard Nepal Quick Dispatch Authorities for one-tap switching
 */
export const NEPAL_DISPATCH_AUTHORITIES = [
  { id: "police", name: "Nepal Police", number: "100", category: "Law & Security", icon: "👮" },
  { id: "ambulance", name: "Nepal Ambulance (NAS)", number: "102", category: "Medical", icon: "🚑" },
  { id: "fire", name: "Fire Brigade", number: "101", category: "Fire & Rescue", icon: "🚒" },
  { id: "traffic", name: "Metropolitan Traffic", number: "103", category: "Traffic", icon: "🚦" },
  { id: "disaster", name: "NEOC Disaster Center", number: "1155", category: "Disaster", icon: "🏔️" },
  { id: "apf", name: "Armed Police (APF)", number: "1114", category: "Paramilitary", icon: "🛡️" },
  { id: "redcross", name: "Nepal Red Cross", number: "1130", category: "Medical Support", icon: "🏥" },
  { id: "child", name: "Child Helpline", number: "1098", category: "Protection", icon: "👶" },
  { id: "women", name: "Women Commission", number: "1145", category: "Protection", icon: "👩" },
];
