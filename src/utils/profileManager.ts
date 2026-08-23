import { UserProfile } from "../types";

const SAVED_PROFILES_KEY = "khoji_saved_profiles";
const ACTIVE_UID_KEY = "khoji_active_uid";

/**
 * Retrieves all profiles saved in local storage on this device
 */
export function getSavedProfiles(): UserProfile[] {
  try {
    const raw = localStorage.getItem(SAVED_PROFILES_KEY);
    if (!raw) return [];
    const list: UserProfile[] = JSON.parse(raw);
    return Array.isArray(list) ? list : [];
  } catch (e) {
    console.error("Error reading saved profiles from storage:", e);
    return [];
  }
}

/**
 * Retrieves the currently active profile UID
 */
export function getActiveProfileId(): string | null {
  try {
    return localStorage.getItem(ACTIVE_UID_KEY) || null;
  } catch {
    return null;
  }
}

/**
 * Retrieves the active UserProfile object if one is stored
 */
export function getActiveProfile(): UserProfile | null {
  const activeId = getActiveProfileId();
  const saved = getSavedProfiles();
  if (!activeId && saved.length > 0) {
    // If no active UID explicitly set, default to first saved profile
    setActiveProfileId(saved[0].uid);
    return saved[0];
  }
  if (!activeId) return null;
  return saved.find((p) => p.uid === activeId) || null;
}

/**
 * Sets the active profile ID
 */
export function setActiveProfileId(uid: string | null): void {
  try {
    if (uid) {
      localStorage.setItem(ACTIVE_UID_KEY, uid);
    } else {
      localStorage.removeItem(ACTIVE_UID_KEY);
    }
  } catch (e) {
    console.error("Error setting active profile ID:", e);
  }
}

/**
 * Saves or updates a user profile in local storage and optionally sets it as active
 */
export function saveProfile(profile: UserProfile, makeActive: boolean = true): UserProfile[] {
  try {
    const current = getSavedProfiles();
    const index = current.findIndex((p) => p.uid === profile.uid);

    let updated: UserProfile[];
    if (index >= 0) {
      updated = [...current];
      updated[index] = { ...updated[index], ...profile, updatedAt: new Date().toISOString() };
    } else {
      updated = [profile, ...current];
    }

    localStorage.setItem(SAVED_PROFILES_KEY, JSON.stringify(updated));
    localStorage.setItem(`khoji_user_${profile.uid}`, JSON.stringify(profile));

    // Also sync to all users pool for Admin view
    const allRaw = localStorage.getItem("khoji_all_users");
    const allUsers: UserProfile[] = allRaw ? JSON.parse(allRaw) : [];
    const allIndex = allUsers.findIndex((u) => u.uid === profile.uid);
    if (allIndex >= 0) {
      allUsers[allIndex] = profile;
    } else {
      allUsers.push(profile);
    }
    localStorage.setItem("khoji_all_users", JSON.stringify(allUsers));

    if (makeActive) {
      setActiveProfileId(profile.uid);
    }

    return updated;
  } catch (e) {
    console.error("Error saving profile:", e);
    return getSavedProfiles();
  }
}

/**
 * Switches the active profile to the one with the given UID
 */
export function switchActiveProfile(uid: string): UserProfile | null {
  const saved = getSavedProfiles();
  const target = saved.find((p) => p.uid === uid);
  if (target) {
    setActiveProfileId(uid);
    return target;
  }
  return null;
}

/**
 * Deletes a profile from the saved list.
 * If the deleted profile was active, it switches to the next available profile (if any).
 */
export function deleteProfile(uid: string): { remaining: UserProfile[]; newActive: UserProfile | null } {
  try {
    const saved = getSavedProfiles();
    const filtered = saved.filter((p) => p.uid !== uid);
    localStorage.setItem(SAVED_PROFILES_KEY, JSON.stringify(filtered));
    localStorage.removeItem(`khoji_user_${uid}`);

    const activeId = getActiveProfileId();
    let newActive: UserProfile | null = null;

    if (activeId === uid) {
      if (filtered.length > 0) {
        newActive = filtered[0];
        setActiveProfileId(newActive.uid);
      } else {
        setActiveProfileId(null);
      }
    } else {
      newActive = saved.find((p) => p.uid === activeId) || (filtered.length > 0 ? filtered[0] : null);
      if (newActive) setActiveProfileId(newActive.uid);
    }

    return { remaining: filtered, newActive };
  } catch (e) {
    console.error("Error deleting profile:", e);
    const saved = getSavedProfiles();
    return { remaining: saved, newActive: getActiveProfile() };
  }
}

/**
 * Clears all saved profiles and active session
 */
export function clearAllProfiles(): void {
  try {
    localStorage.removeItem(SAVED_PROFILES_KEY);
    localStorage.removeItem(ACTIVE_UID_KEY);
  } catch (e) {
    console.error("Error clearing profiles:", e);
  }
}
