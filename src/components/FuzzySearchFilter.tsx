import React, { useState, useMemo, useEffect } from "react";
import Fuse, { type IFuseOptions } from "fuse.js";
import {
  Search,
  X,
  SlidersHorizontal,
  ArrowUpDown,
  Tag,
  Grid,
  List as ListIcon,
  RotateCcw,
  Sparkles,
  Check,
} from "lucide-react";
import { useDebounce } from "../hooks/useDebounce";

export type SortOptionValue =
  | "relevance"
  | "newest"
  | "oldest"
  | "name_asc"
  | "name_desc"
  | "popularity"
  | "priority";

export interface CustomSortOption<T> {
  value: string;
  label: string;
  compareFn: (a: T, b: T) => number;
}

export interface CategoryOption {
  value: string;
  label: string;
  count?: number;
}

export interface FuzzySearchFilterProps<T = any> {
  /** The source array of data items to search and filter */
  items: T[];

  /** Object keys to search against with Fuse.js (e.g. ['title', 'description', 'category', 'location']) */
  searchKeys: string[];

  /** Optional placeholder for the search input */
  placeholder?: string;

  /** Key to extract category values from items automatically (default: 'category') */
  categoryKey?: string;

  /** Predefined category list if automatic extraction isn't desired */
  categories?: CategoryOption[];

  /** Key for date sorting (e.g. 'createdAt', 'updatedAt', 'timestamp', 'date') */
  dateKey?: string;

  /** Key for name/alphabetical sorting (e.g. 'title', 'name', 'fullName') */
  titleKey?: string;

  /** Key for popularity/priority sorting (e.g. 'popularity', 'priority', 'views', 'score') */
  popularityKey?: string;

  /** Custom sorting options to supplement default options */
  customSortOptions?: CustomSortOption<T>[];

  /** Debounce delay for the search input in milliseconds (default: 250ms) */
  debounceMs?: number;

  /** Fuse.js fuzzy matching sensitivity (0.0 = exact, 1.0 = match anything; default: 0.35) */
  fuzzyThreshold?: number;

  /** Custom Fuse.js configuration overrides */
  fuseOptions?: Partial<IFuseOptions<T>>;

  /** Callback fired whenever the filtered list updates */
  onFilteredResultsChange?: (filtered: T[]) => void;

  /** Custom item renderer for default list/grid layout */
  renderItem?: (item: T, index: number, meta: { isFuzzyMatch: boolean; searchScore?: number }) => React.ReactNode;

  /** Empty state message or custom component */
  emptyMessage?: React.ReactNode;

  /** Enable quick-filter category pills below the search bar */
  showCategoryPills?: boolean;

  /** Enable layout toggle (Grid / List view) */
  showViewToggle?: boolean;

  /** Default view mode */
  defaultViewMode?: "grid" | "list";

  /** Optional heading or title above the search bar */
  title?: string;

  /** Optional description or hint text */
  description?: string;

  /** Custom CSS classes for container wrapper */
  className?: string;

  /** Render prop pattern if parent wants full control over the result rendering */
  children?: (
    filteredItems: T[],
    meta: {
      rawQuery: string;
      debouncedQuery: string;
      selectedCategory: string;
      selectedSort: string;
      totalItems: number;
      filteredCount: number;
      isDebouncing: boolean;
      viewMode: "grid" | "list";
      resetFilters: () => void;
    }
  ) => React.ReactNode;
}

export function FuzzySearchFilter<T extends Record<string, any> = any>({
  items = [],
  searchKeys,
  placeholder = "Search with fuzzy typo matching...",
  categoryKey = "category",
  categories: customCategories,
  dateKey = "createdAt",
  titleKey = "name",
  popularityKey = "popularity",
  customSortOptions = [],
  debounceMs = 250,
  fuzzyThreshold = 0.35,
  fuseOptions = {},
  onFilteredResultsChange,
  renderItem,
  emptyMessage,
  showCategoryPills = true,
  showViewToggle = false,
  defaultViewMode = "list",
  title,
  description,
  className = "",
  children,
}: FuzzySearchFilterProps<T>) {
  // Input state
  const [searchInput, setSearchInput] = useState<string>("");
  const debouncedQuery = useDebounce(searchInput.trim(), debounceMs);

  // Filter & sort states
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedSort, setSelectedSort] = useState<string>("relevance");
  const [viewMode, setViewMode] = useState<"grid" | "list">(defaultViewMode);

  // Track debouncing status
  const isDebouncing = searchInput.trim() !== debouncedQuery;

  // 1. Compute dynamic category list with item counts
  const availableCategories = useMemo<CategoryOption[]>(() => {
    if (customCategories && customCategories.length > 0) {
      return customCategories;
    }

    const counts: Record<string, number> = {};
    items.forEach((item) => {
      const catVal = item[categoryKey as keyof T];
      if (catVal && typeof catVal === "string") {
        const normalized = catVal.trim();
        counts[normalized] = (counts[normalized] || 0) + 1;
      }
    });

    const list: CategoryOption[] = Object.keys(counts)
      .sort()
      .map((cat) => ({
        value: cat,
        label: cat.charAt(0).toUpperCase() + cat.slice(1),
        count: counts[cat],
      }));

    return [{ value: "all", label: "All Categories", count: items.length }, ...list];
  }, [items, customCategories, categoryKey]);

  // 2. Initialize and memoize Fuse.js index
  const fuse = useMemo(() => {
    const defaultOptions: IFuseOptions<T> = {
      keys: searchKeys as string[],
      threshold: fuzzyThreshold,
      distance: 100,
      minMatchCharLength: 1,
      ignoreLocation: true,
      includeScore: true,
      includeMatches: true,
      useExtendedSearch: true,
      ...fuseOptions,
    };

    return new Fuse(items, defaultOptions);
  }, [items, searchKeys, fuzzyThreshold, fuseOptions]);

  // 3. Perform Fuzzy Filtering + Category Filtering + Sorting
  const filteredResults = useMemo<{ item: T; score?: number }[]>(() => {
    let intermediate: { item: T; score?: number }[] = [];

    // Step A: Fuzzy search or full items list
    if (debouncedQuery.length > 0) {
      const searchResults = fuse.search(debouncedQuery);
      intermediate = searchResults.map((res) => ({
        item: res.item,
        score: res.score,
      }));
    } else {
      intermediate = items.map((item) => ({ item, score: undefined }));
    }

    // Step B: Filter by Category
    if (selectedCategory !== "all") {
      intermediate = intermediate.filter(({ item }) => {
        const catVal = item[categoryKey as keyof T];
        if (!catVal) return false;
        return String(catVal).toLowerCase() === selectedCategory.toLowerCase();
      });
    }

    // Step C: Sort Results
    const sorted = [...intermediate];

    // Check if custom sort applies
    const customSort = customSortOptions.find((opt) => opt.value === selectedSort);
    if (customSort) {
      sorted.sort((a, b) => customSort.compareFn(a.item, b.item));
    } else {
      switch (selectedSort) {
        case "relevance":
          // If a search query is active, sort by best Fuse.js score (lower score = closer match)
          if (debouncedQuery.length > 0) {
            sorted.sort((a, b) => (a.score ?? 1) - (b.score ?? 1));
          }
          break;

        case "newest":
          sorted.sort((a, b) => {
            const dateA = new Date(a.item[dateKey as keyof T] || 0).getTime();
            const dateB = new Date(b.item[dateKey as keyof T] || 0).getTime();
            return dateB - dateA;
          });
          break;

        case "oldest":
          sorted.sort((a, b) => {
            const dateA = new Date(a.item[dateKey as keyof T] || 0).getTime();
            const dateB = new Date(b.item[dateKey as keyof T] || 0).getTime();
            return dateA - dateB;
          });
          break;

        case "name_asc":
          sorted.sort((a, b) => {
            const valA = String(a.item[titleKey as keyof T] || "").toLowerCase();
            const valB = String(b.item[titleKey as keyof T] || "").toLowerCase();
            return valA.localeCompare(valB);
          });
          break;

        case "name_desc":
          sorted.sort((a, b) => {
            const valA = String(a.item[titleKey as keyof T] || "").toLowerCase();
            const valB = String(b.item[titleKey as keyof T] || "").toLowerCase();
            return valB.localeCompare(valA);
          });
          break;

        case "popularity":
        case "priority":
          sorted.sort((a, b) => {
            const popA = Number(a.item[popularityKey as keyof T] || 0);
            const popB = Number(b.item[popularityKey as keyof T] || 0);
            return popB - popA;
          });
          break;
      }
    }

    return sorted;
  }, [
    items,
    debouncedQuery,
    selectedCategory,
    selectedSort,
    fuse,
    categoryKey,
    dateKey,
    titleKey,
    popularityKey,
    customSortOptions,
  ]);

  // Extract raw filtered items array
  const rawFilteredItems = useMemo(
    () => filteredResults.map((r) => r.item),
    [filteredResults]
  );

  // Notify parent on filtered items change
  useEffect(() => {
    if (onFilteredResultsChange) {
      onFilteredResultsChange(rawFilteredItems);
    }
  }, [rawFilteredItems, onFilteredResultsChange]);

  // Reset all filters helper
  const handleResetFilters = () => {
    setSearchInput("");
    setSelectedCategory("all");
    setSelectedSort("relevance");
  };

  const hasActiveFilters =
    searchInput.trim().length > 0 ||
    selectedCategory !== "all" ||
    selectedSort !== "relevance";

  return (
    <div className={`space-y-4 ${className}`} id="fuzzy-search-filter-container">
      {/* Header section (optional) */}
      {(title || description) && (
        <div className="space-y-1">
          {title && <h3 className="text-base font-extrabold text-slate-900">{title}</h3>}
          {description && <p className="text-xs text-slate-500">{description}</p>}
        </div>
      )}

      {/* Main Filter Toolbar */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
        {/* Search Input + Dropdowns row */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          {/* Debounced Fuzzy Search Input Box */}
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>

            <input
              id="fuzzy-search-input"
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder={placeholder}
              className="w-full text-xs font-medium pl-10 pr-20 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all shadow-inner"
            />

            {/* Right side controls inside search box (Debounce indicator / Clear button) */}
            <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center gap-1.5">
              {isDebouncing && (
                <span className="flex items-center gap-1 text-[10px] text-blue-600 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded font-mono animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-ping" />
                  typing
                </span>
              )}

              {searchInput.length > 0 && (
                <button
                  id="fuzzy-search-clear-btn"
                  onClick={() => setSearchInput("")}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition cursor-pointer"
                  title="Clear search query"
                  type="button"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Category Dropdown */}
          {availableCategories.length > 1 && (
            <div className="relative min-w-[150px]">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Tag className="w-3.5 h-3.5" />
              </div>
              <select
                id="fuzzy-category-select"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full text-xs font-semibold pl-8 pr-7 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 appearance-none transition cursor-pointer"
              >
                {availableCategories.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label} {cat.count !== undefined ? `(${cat.count})` : ""}
                  </option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none text-slate-400">
                <SlidersHorizontal className="w-3 h-3" />
              </div>
            </div>
          )}

          {/* Sort Dropdown */}
          <div className="relative min-w-[150px]">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <ArrowUpDown className="w-3.5 h-3.5" />
            </div>
            <select
              id="fuzzy-sort-select"
              value={selectedSort}
              onChange={(e) => setSelectedSort(e.target.value)}
              className="w-full text-xs font-semibold pl-8 pr-7 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 appearance-none transition cursor-pointer"
            >
              <option value="relevance">
                {debouncedQuery ? "⚡ Best Fuzzy Match" : "⚡ Default Order"}
              </option>
              <option value="newest">🕒 Newest First</option>
              <option value="oldest">🕒 Oldest First</option>
              <option value="name_asc">🔤 Name (A → Z)</option>
              <option value="name_desc">🔤 Name (Z → A)</option>
              <option value="popularity">🔥 High Priority / Popular</option>
              {customSortOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none text-slate-400">
              <SlidersHorizontal className="w-3 h-3" />
            </div>
          </div>

          {/* Optional Grid / List View Toggle */}
          {showViewToggle && (
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 self-end sm:self-auto">
              <button
                id="fuzzy-view-list-btn"
                onClick={() => setViewMode("list")}
                className={`p-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  viewMode === "list"
                    ? "bg-white text-blue-600 shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                }`}
                title="List View"
                type="button"
              >
                <ListIcon className="w-4 h-4" />
              </button>
              <button
                id="fuzzy-view-grid-btn"
                onClick={() => setViewMode("grid")}
                className={`p-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  viewMode === "grid"
                    ? "bg-white text-blue-600 shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                }`}
                title="Grid View"
                type="button"
              >
                <Grid className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Quick Filter Category Pills */}
        {showCategoryPills && availableCategories.length > 2 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-0.5 no-scrollbar">
            {availableCategories.map((cat) => {
              const isSelected = selectedCategory === cat.value;
              return (
                <button
                  key={cat.value}
                  id={`fuzzy-pill-${cat.value}`}
                  onClick={() => setSelectedCategory(cat.value)}
                  type="button"
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                    isSelected
                      ? "bg-blue-600 text-white shadow-sm shadow-blue-500/20"
                      : "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200/60"
                  }`}
                >
                  {isSelected && <Check className="w-3 h-3" />}
                  <span>{cat.label}</span>
                  {cat.count !== undefined && (
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-medium ${
                        isSelected
                          ? "bg-blue-700 text-blue-100"
                          : "bg-slate-200 text-slate-600"
                      }`}
                    >
                      {cat.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Active Filter Summary Bar & Count */}
        <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-800">
              Showing <b className="text-blue-600">{rawFilteredItems.length}</b> of{" "}
              <b>{items.length}</b> items
            </span>

            {debouncedQuery && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 text-[11px] font-medium">
                <Sparkles className="w-3 h-3 text-blue-500" />
                Fuzzy: &quot;{debouncedQuery}&quot;
              </span>
            )}
          </div>

          {hasActiveFilters && (
            <button
              id="fuzzy-reset-all-filters-btn"
              onClick={handleResetFilters}
              type="button"
              className="flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-red-600 hover:underline transition cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Filters</span>
            </button>
          )}
        </div>
      </div>

      {/* Render Output via Children Render Prop OR Default Item Renderer */}
      {children ? (
        children(rawFilteredItems, {
          rawQuery: searchInput,
          debouncedQuery,
          selectedCategory,
          selectedSort,
          totalItems: items.length,
          filteredCount: rawFilteredItems.length,
          isDebouncing,
          viewMode,
          resetFilters: handleResetFilters,
        })
      ) : (
        <div id="fuzzy-results-container">
          {rawFilteredItems.length === 0 ? (
            emptyMessage || (
              <div
                id="fuzzy-empty-state"
                className="bg-white rounded-2xl p-8 border border-slate-200 text-center space-y-3"
              >
                <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
                  <Search className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-slate-800">No matching items found</h4>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    {debouncedQuery
                      ? `We couldn't find anything matching "${debouncedQuery}" with typo tolerance. Try checking for different keywords.`
                      : "There are no items matching the selected filters."}
                  </p>
                </div>
                {hasActiveFilters && (
                  <button
                    onClick={handleResetFilters}
                    type="button"
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-sm"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Clear Search & Filters</span>
                  </button>
                )}
              </div>
            )
          ) : (
            <div
              className={
                viewMode === "grid"
                  ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
                  : "space-y-2.5"
              }
            >
              {filteredResults.map(({ item, score }, index) => {
                if (renderItem) {
                  return (
                    <React.Fragment key={item.id || item.uid || index}>
                      {renderItem(item, index, {
                        isFuzzyMatch: debouncedQuery.length > 0,
                        searchScore: score,
                      })}
                    </React.Fragment>
                  );
                }

                // Default fallback card
                return (
                  <div
                    key={item.id || item.uid || index}
                    className="bg-white p-4 rounded-xl border border-slate-200 hover:border-slate-300 transition shadow-xs flex items-start justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-800">
                          {item[titleKey as keyof T] || "Item #" + (index + 1)}
                        </span>
                        {item[categoryKey as keyof T] && (
                          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                            {String(item[categoryKey as keyof T])}
                          </span>
                        )}
                      </div>
                      {item.description && (
                        <p className="text-xs text-slate-500 leading-normal">
                          {String(item.description)}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default FuzzySearchFilter;
