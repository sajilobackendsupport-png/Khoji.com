export interface UserLocation {
  lat: number;
  lng: number;
  accuracy?: number;
  heading?: number; // 0 to 360 degrees (0 = North, 90 = East, 180 = South, 270 = West)
  speed?: number; // Speed in m/s or km/h
  altitude?: number; // Altitude in meters
  timestamp: string;
}

export interface LocationBreadcrumb {
  lat: number;
  lng: number;
  heading?: number;
  speed?: number;
  timestamp: string;
}

export type UserStatus = "normal" | "lost" | "emergency";
export type UserRole = "user" | "admin";

export interface DeviceInfo {
  deviceId: string;
  deviceName: string;
  lastLocation: UserLocation;
  status: UserStatus;
  updatedAt: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  fullName: string;
  phone: string;
  role: UserRole;
  status: UserStatus;
  bloodGroup?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  address?: string;
  medicalNotes?: string;
  citizenshipNumber?: string;
  emailVerified?: boolean;
  verificationMethod?: string;
  lastLocation?: UserLocation;
  devices?: { [deviceId: string]: DeviceInfo };
  createdAt?: string;
  updatedAt: string;
}

export type EmergencyType = "police" | "fire" | "ambulance" | "lost";
export type EmergencyStatus = "active" | "resolved";

export interface EmergencyAlert {
  id: string;
  userId: string;
  userName: string;
  userPhone: string;
  type: EmergencyType;
  serviceName?: string;
  servicePhone?: string;
  nearestStation?: string;
  nearestStationPhone?: string;
  nearestStationDistance?: string;
  status: EmergencyStatus;
  location: {
    lat: number;
    lng: number;
  };
  address?: string;
  details: string;
  deviceId?: string;
  deviceName?: string;
  dialTriggeredOnUserDevice?: boolean;
  redirectedToService?: string;
  adminNotes?: string;
  createdAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
}

export interface NepalEmergencyContact {
  id?: string;
  name: string;
  number: string;
  description: string;
  location: string;
  icon?: "police" | "fire" | "ambulance" | "hospital" | "disaster" | "general";
  category?: "national" | "local" | "hospital" | "disaster";
  enabled?: boolean;
}

export type ThemeColor = "red" | "crimson" | "blue" | "emerald" | "amber" | "indigo" | "purple" | "slate";

export interface QuickMapRegion {
  id: string;
  name: string;
  lat: number;
  lng: number;
  zoom: number;
  description?: string;
}

export interface CrisisGuideItem {
  id: string;
  title: string;
  category: string;
  summary: string;
  steps: string[];
  helpline?: string;
  icon?: string;
  content?: string;
}

export interface SiteConfig {
  siteTitle: string;
  siteTagline: string;
  brandLogoText: string;
  badgeText: string;
  themeColor: ThemeColor;
  organizationName: string;
  footerNotice: string;
  
  // Emergency Broadcast Banner
  bannerEnabled: boolean;
  bannerText: string;
  bannerType: "info" | "warning" | "critical" | "drill";
  bannerSeverity?: "info" | "warning" | "critical" | "drill";
  bannerActionText?: string;
  bannerActionLink?: string;

  // Contacts & Helplines
  contacts: NepalEmergencyContact[];

  // Map settings
  defaultMapCenter: {
    lat: number;
    lng: number;
  };
  defaultMapZoom: number;
  mapTheme: "standard" | "satellite" | "dark" | "light";
  quickRegions: QuickMapRegion[];

  // SOS protocols & guidelines
  sosProtocols: {
    police: string;
    fire: string;
    ambulance: string;
    lost: string;
  };

  // Crisis safety guides
  crisisGuides: CrisisGuideItem[];

  // Feature flags
  features: {
    enableAudioSiren: boolean;
    enableDesktopNotifications: boolean;
    enableMultiDeviceTracking: boolean;
    enablePublicGuestSOS: boolean;
  };

  updatedAt: string;
  updatedBy?: string;
}
