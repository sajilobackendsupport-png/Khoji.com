import React, { useState, useEffect, useCallback } from "react";
import { Bookmark, BookmarkCheck } from "lucide-react";

export interface SavedItem {
  id: string;
  title: string;
  category?: string;
  description?: string;
  url?: string;
  metadata?: Record<string, any>;
  savedAt: string;
}

const STORAGE_PREFIX = "khoji_saved_items_";

/**
 * Custom React hook for Saved/Bookmarked items with instant Optimistic UI updates.
 *
 * @param userId Unique user ID for multi-user session scoping
 */
export function useSavedItems(userId: string = "guest") {
  const storageKey = `${STORAGE_PREFIX}${userId}`;

  const [savedItems, setSavedItems] = useState<SavedItem[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const stored = localStorage.getItem(storageKey);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Re-sync whenever userId changes
  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      setSavedItems(stored ? JSON.parse(stored) : []);
    } catch {
      setSavedItems([]);
    }
  }, [storageKey]);

  const isSaved = useCallback(
    (id: string) => savedItems.some((item) => item.id === id),
    [savedItems]
  );

  /**
   * Optimistically toggle bookmark/saved state for an item.
   * Gives instant visual feedback to user, then persists.
   */
  const toggleSave = useCallback(
    (item: Omit<SavedItem, "savedAt"> & { savedAt?: string }) => {
      const exists = savedItems.some((i) => i.id === item.id);
      const previousState = [...savedItems];

      let updated: SavedItem[];
      if (exists) {
        // Optimistically remove
        updated = savedItems.filter((i) => i.id !== item.id);
      } else {
        // Optimistically add
        const newItem: SavedItem = {
          ...item,
          savedAt: new Date().toISOString(),
        };
        updated = [newItem, ...savedItems];
      }

      // 1. Instant state update (Optimistic UI)
      setSavedItems(updated);

      // 2. Persist to storage / cloud
      try {
        localStorage.setItem(storageKey, JSON.stringify(updated));
      } catch (err) {
        console.error("Failed to persist saved item, rolling back:", err);
        // Rollback state on persistence failure
        setSavedItems(previousState);
      }
    },
    [savedItems, storageKey]
  );

  const clearSaved = useCallback(() => {
    setSavedItems([]);
    localStorage.removeItem(storageKey);
  }, [storageKey]);

  return {
    savedItems,
    isSaved,
    toggleSave,
    clearSaved,
    totalSaved: savedItems.length,
  };
}

/**
 * Reusable interactive Bookmark button with optimistic UI state
 */
export const BookmarkButton: React.FC<{
  item: { id: string; title: string; category?: string; description?: string };
  userId?: string;
  className?: string;
  size?: "sm" | "md";
}> = ({ item, userId = "guest", className = "", size = "md" }) => {
  const { isSaved, toggleSave } = useSavedItems(userId);
  const saved = isSaved(item.id);

  return (
    <button
      id={`bookmark-btn-${item.id}`}
      onClick={(e) => {
        e.stopPropagation();
        toggleSave(item);
      }}
      type="button"
      title={saved ? "Remove from Bookmarks" : "Save / Bookmark this item"}
      className={`inline-flex items-center justify-center rounded-xl transition-all duration-150 active:scale-90 cursor-pointer ${
        size === "sm" ? "p-1.5 text-xs" : "p-2 text-sm"
      } ${
        saved
          ? "bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-300 dark:border-amber-700/80 shadow-xs"
          : "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 border border-slate-200/80 dark:border-slate-700"
      } ${className}`}
    >
      {saved ? (
        <BookmarkCheck className={size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4"} />
      ) : (
        <Bookmark className={size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4"} />
      )}
    </button>
  );
};

export default useSavedItems;
