import { useState, useEffect } from "react";

/**
 * Custom React hook that debounces a value by a specified delay in milliseconds.
 * Prevents heavy calculations (like fuzzy search and sorting) on every keystroke.
 *
 * @param value The value to debounce
 * @param delay Delay in milliseconds (default: 250ms)
 * @returns The debounced value
 */
export function useDebounce<T>(value: T, delay: number = 250): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export default useDebounce;
