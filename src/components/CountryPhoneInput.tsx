import React, { useState, useEffect, useRef } from "react";
import {
  COUNTRIES,
  CountryPhoneConfig,
  DEFAULT_COUNTRY,
  validatePhoneNumber,
  parseStoredPhoneNumber,
} from "../utils/phoneValidator";
import { ChevronDown, CheckCircle2, AlertCircle, Search, Smartphone } from "lucide-react";

interface CountryPhoneInputProps {
  value: string;
  onChange: (fullFormattedNumber: string, isValid: boolean, errorMessage: string | null) => void;
  required?: boolean;
  theme?: "light" | "dark";
  id?: string;
  label?: string;
  helperText?: string;
  disabled?: boolean;
}

export default function CountryPhoneInput({
  value,
  onChange,
  required = true,
  theme = "light",
  id = "country-phone-input",
  label = "Contact Phone Number",
  helperText,
  disabled = false,
}: CountryPhoneInputProps) {
  // Initialize country and national number from stored value
  const initialParsed = parseStoredPhoneNumber(value);
  const [selectedCountry, setSelectedCountry] = useState<CountryPhoneConfig>(() => {
    return COUNTRIES.find((c) => c.iso === initialParsed.countryIso) || DEFAULT_COUNTRY;
  });
  const [nationalNumber, setNationalNumber] = useState<string>(initialParsed.nationalNumber);
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [touched, setTouched] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Sync if value prop changes externally
  useEffect(() => {
    const parsed = parseStoredPhoneNumber(value);
    const matchedCountry = COUNTRIES.find((c) => c.iso === parsed.countryIso) || DEFAULT_COUNTRY;
    setSelectedCountry(matchedCountry);
    setNationalNumber(parsed.nationalNumber);
  }, [value]);

  // Handle validation on change
  useEffect(() => {
    const res = validatePhoneNumber(nationalNumber, selectedCountry.iso);
    // If not touched yet and nationalNumber is empty, don't trigger external error unless forced
    if (nationalNumber.trim() === "" && !required) {
      onChange("", true, null);
    } else {
      onChange(res.fullInternationalNumber, res.isValid, res.errorMessage);
    }
  }, [nationalNumber, selectedCountry, required]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
      // Auto-focus search input when opened
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [isOpen]);

  const validation = validatePhoneNumber(nationalNumber, selectedCountry.iso);
  const isNumberEmpty = nationalNumber.trim().length === 0;
  const isInvalid = touched && !isNumberEmpty && !validation.isValid;
  const isValid = !isNumberEmpty && validation.isValid;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTouched(true);
    // Only permit digits
    const cleanedDigits = e.target.value.replace(/\D/g, "");
    setNationalNumber(cleanedDigits);
  };

  const handleCountrySelect = (country: CountryPhoneConfig) => {
    setSelectedCountry(country);
    setIsOpen(false);
    setSearchQuery("");
    setTouched(true);
  };

  const filteredCountries = COUNTRIES.filter((c) => {
    const q = searchQuery.toLowerCase().trim();
    return (
      c.name.toLowerCase().includes(q) ||
      c.dialCode.includes(q) ||
      c.iso.toLowerCase().includes(q)
    );
  });

  const isDark = theme === "dark";

  return (
    <div className="space-y-1.5 w-full font-sans" id={`${id}-wrapper`}>
      {label && (
        <label
          htmlFor={id}
          className={`text-xs font-bold flex items-center justify-between ${
            isDark ? "text-slate-300" : "text-slate-700"
          }`}
        >
          <span className="flex items-center gap-1.5">
            <Smartphone className="w-3.5 h-3.5 text-red-500" />
            <span>{label}</span>
            {required && <span className="text-red-500">*</span>}
          </span>
          <span
            className={`text-[10px] font-mono font-medium ${
              isDark ? "text-slate-400" : "text-slate-400"
            }`}
          >
            {selectedCountry.flag} {selectedCountry.name} ({selectedCountry.dialCode})
          </span>
        </label>
      )}

      {/* Input container with Country Selector & Phone Number Field */}
      <div className="relative flex items-center gap-1.5" ref={dropdownRef}>
        {/* Country Code Picker Button */}
        <div className="relative">
          <button
            type="button"
            id={`${id}-country-selector`}
            disabled={disabled}
            onClick={() => setIsOpen(!isOpen)}
            className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl border text-xs font-bold transition shadow-xs cursor-pointer select-none ${
              isDark
                ? "bg-slate-900 border-slate-700 text-white hover:bg-slate-800 focus:border-red-500"
                : "bg-slate-50 border-slate-200 text-slate-800 hover:bg-slate-100 hover:border-slate-300 focus:border-red-500"
            }`}
            title={`Selected country: ${selectedCountry.name} (${selectedCountry.dialCode})`}
          >
            <span className="text-base leading-none">{selectedCountry.flag}</span>
            <span className="font-mono text-xs">{selectedCountry.dialCode}</span>
            <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
          </button>

          {/* Searchable Country Dropdown Modal */}
          {isOpen && (
            <div
              className={`absolute top-full left-0 mt-1.5 w-72 sm:w-80 max-h-72 rounded-2xl shadow-2xl border z-50 flex flex-col overflow-hidden animate-in fade-in-50 zoom-in-95 duration-100 ${
                isDark
                  ? "bg-slate-950 border-slate-700 text-white"
                  : "bg-white border-slate-200 text-slate-900"
              }`}
            >
              {/* Search bar inside dropdown */}
              <div className={`p-2.5 border-b ${isDark ? "border-slate-800 bg-slate-900" : "border-slate-100 bg-slate-50"}`}>
                <div className="relative flex items-center">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Search country or code (e.g. Nepal, 977)..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className={`w-full text-xs pl-8 pr-3 py-2 rounded-lg border outline-none font-sans ${
                      isDark
                        ? "bg-slate-950 border-slate-700 text-white focus:border-red-500"
                        : "bg-white border-slate-200 text-slate-800 focus:border-red-500"
                    }`}
                  />
                </div>
              </div>

              {/* Countries scrollable list */}
              <div className="overflow-y-auto max-h-56 divide-y divide-slate-100/10">
                {filteredCountries.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-400">
                    No country found matching &quot;{searchQuery}&quot;
                  </div>
                ) : (
                  filteredCountries.map((c) => {
                    const isSelected = c.iso === selectedCountry.iso;
                    return (
                      <button
                        key={c.iso}
                        type="button"
                        onClick={() => handleCountrySelect(c)}
                        className={`w-full px-3.5 py-2 text-left flex items-center justify-between text-xs transition cursor-pointer ${
                          isSelected
                            ? isDark
                              ? "bg-red-950/60 text-red-300 font-bold"
                              : "bg-red-50 text-red-900 font-bold"
                            : isDark
                            ? "hover:bg-slate-900 text-slate-200"
                            : "hover:bg-slate-50 text-slate-700"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          <span className="text-base leading-none">{c.flag}</span>
                          <span className="truncate">{c.name}</span>
                        </div>
                        <span className="font-mono text-[11px] font-bold text-slate-400 flex-shrink-0 ml-2">
                          {c.dialCode}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* National Number Input Field */}
        <div className="relative flex-1">
          <input
            id={id}
            type="tel"
            disabled={disabled}
            placeholder={`e.g. ${selectedCountry.example}`}
            value={nationalNumber}
            onFocus={() => setTouched(true)}
            onBlur={() => setTouched(true)}
            onChange={handleInputChange}
            className={`w-full text-xs font-mono px-3.5 py-2.5 rounded-xl border outline-none transition ${
              isInvalid
                ? isDark
                  ? "bg-red-950/30 border-red-500 text-white focus:ring-1 focus:ring-red-500"
                  : "bg-red-50/50 border-red-400 text-slate-900 focus:ring-1 focus:ring-red-500"
                : isValid
                ? isDark
                  ? "bg-slate-900/80 border-emerald-500/80 text-white focus:border-emerald-400"
                  : "bg-emerald-50/30 border-emerald-400 text-slate-900 focus:border-emerald-500"
                : isDark
                ? "bg-slate-900/60 border-slate-700 text-white focus:border-red-500"
                : "bg-slate-50 border-slate-200 text-slate-900 focus:border-red-500"
            }`}
          />

          {/* Validation Icon Badge inside input */}
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center pointer-events-none">
            {isValid && (
              <CheckCircle2 className="w-4 h-4 text-emerald-500 animate-in zoom-in-50 duration-150" />
            )}
            {isInvalid && (
              <AlertCircle className="w-4 h-4 text-red-500 animate-in zoom-in-50 duration-150" />
            )}
          </div>
        </div>
      </div>

      {/* Dynamic Validation Warning & Hint */}
      {isInvalid && validation.errorMessage && (
        <div className="flex items-center gap-1.5 text-[11px] font-bold text-red-600 animate-in fade-in-50 duration-100 pl-0.5">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          <span>{validation.errorMessage}</span>
        </div>
      )}

      {isValid && (
        <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 pl-0.5">
          <CheckCircle2 className="w-3 h-3 flex-shrink-0" />
          <span>
            Valid {selectedCountry.name} contact number: {validation.fullInternationalNumber}
          </span>
        </div>
      )}

      {!isInvalid && !isValid && (helperText || selectedCountry.hint) && (
        <p className={`text-[10px] pl-0.5 ${isDark ? "text-slate-400" : "text-slate-400"}`}>
          {helperText || `Format: ${selectedCountry.hint}`}
        </p>
      )}
    </div>
  );
}
