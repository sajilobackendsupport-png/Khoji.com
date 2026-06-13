export interface UserLocation {
  lat: number;
  lng: number;
  accuracy?: number;
  timestamp: string;
}

export type UserStatus = "normal" | "lost" | "emergency";
export type UserRole = "user" | "admin";

export interface UserProfile {
  uid: string;
  email: string;
  fullName: string;
  phone: string;
  role: UserRole;
  status: UserStatus;
  lastLocation?: UserLocation;
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
  createdAt: string;
  resolvedAt?: string;
}

export interface NepalEmergencyContact {
  name: string;
  number: string;
  description: string;
  location: string;
}
