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
  lastLocation?: UserLocation;
  devices?: { [deviceId: string]: DeviceInfo };
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
  status: EmergencyStatus;
  location: {
    lat: number;
    lng: number;
  };
  details: string;
  deviceId?: string;
  createdAt: string;
  resolvedAt?: string;
}

export interface NepalEmergencyContact {
  name: string;
  number: string;
  description: string;
  location: string;
}
