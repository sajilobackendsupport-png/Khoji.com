export interface CountryPhoneConfig {
  iso: string;
  name: string;
  dialCode: string;
  flag: string;
  example: string;
  minLength: number;
  maxLength: number;
  pattern: RegExp;
  hint: string;
}

export const COUNTRIES: CountryPhoneConfig[] = [
  {
    iso: "NP",
    name: "Nepal",
    dialCode: "+977",
    flag: "🇳🇵",
    example: "9841234567",
    minLength: 10,
    maxLength: 10,
    pattern: /^(?:98\d{8}|97\d{8}|96\d{8}|01\d{7}|0[2-9]\d{7})$/,
    hint: "10-digit mobile starting with 98 / 97 / 96",
  },
  {
    iso: "IN",
    name: "India",
    dialCode: "+91",
    flag: "🇮🇳",
    example: "9876543210",
    minLength: 10,
    maxLength: 10,
    pattern: /^[6-9]\d{9}$/,
    hint: "10-digit mobile starting with 6, 7, 8, or 9",
  },
  {
    iso: "US",
    name: "United States",
    dialCode: "+1",
    flag: "🇺🇸",
    example: "2025550143",
    minLength: 10,
    maxLength: 10,
    pattern: /^[2-9]\d{9}$/,
    hint: "10-digit phone number with area code",
  },
  {
    iso: "CA",
    name: "Canada",
    dialCode: "+1",
    flag: "🇨🇦",
    example: "4165550198",
    minLength: 10,
    maxLength: 10,
    pattern: /^[2-9]\d{9}$/,
    hint: "10-digit Canadian phone number",
  },
  {
    iso: "GB",
    name: "United Kingdom",
    dialCode: "+44",
    flag: "🇬🇧",
    example: "7911123456",
    minLength: 10,
    maxLength: 11,
    pattern: /^(?:7\d{9}|[1-9]\d{9,10})$/,
    hint: "10 or 11 digits (UK mobile/landline)",
  },
  {
    iso: "AU",
    name: "Australia",
    dialCode: "+61",
    flag: "🇦🇺",
    example: "412345678",
    minLength: 9,
    maxLength: 10,
    pattern: /^(?:4\d{8}|[2378]\d{8})$/,
    hint: "9 digits (mobile starting with 4)",
  },
  {
    iso: "AE",
    name: "United Arab Emirates",
    dialCode: "+971",
    flag: "🇦🇪",
    example: "501234567",
    minLength: 9,
    maxLength: 9,
    pattern: /^5\d{8}$/,
    hint: "9 digits starting with 5 (e.g. 50, 52, 54)",
  },
  {
    iso: "QA",
    name: "Qatar",
    dialCode: "+974",
    flag: "🇶🇦",
    example: "33123456",
    minLength: 8,
    maxLength: 8,
    pattern: /^[3567]\d{7}$/,
    hint: "8 digits starting with 3, 5, 6, or 7",
  },
  {
    iso: "SA",
    name: "Saudi Arabia",
    dialCode: "+966",
    flag: "🇸🇦",
    example: "512345678",
    minLength: 9,
    maxLength: 9,
    pattern: /^5\d{8}$/,
    hint: "9 digits starting with 5",
  },
  {
    iso: "MY",
    name: "Malaysia",
    dialCode: "+60",
    flag: "🇲🇾",
    example: "123456789",
    minLength: 9,
    maxLength: 10,
    pattern: /^1\d{8,9}$/,
    hint: "9-10 digits starting with 1",
  },
  {
    iso: "SG",
    name: "Singapore",
    dialCode: "+65",
    flag: "🇸🇬",
    example: "81234567",
    minLength: 8,
    maxLength: 8,
    pattern: /^[89]\d{7}$/,
    hint: "8 digits starting with 8 or 9",
  },
  {
    iso: "JP",
    name: "Japan",
    dialCode: "+81",
    flag: "🇯🇵",
    example: "9012345678",
    minLength: 10,
    maxLength: 11,
    pattern: /^(?:[789]0\d{8}|[1-9]\d{9})$/,
    hint: "10-11 digits (mobile starting with 70, 80, 90)",
  },
  {
    iso: "KR",
    name: "South Korea",
    dialCode: "+82",
    flag: "🇰🇷",
    example: "1012345678",
    minLength: 9,
    maxLength: 11,
    pattern: /^(?:10\d{8}|[1-9]\d{8,10})$/,
    hint: "9-11 digits (mobile starting with 10)",
  },
  {
    iso: "CN",
    name: "China",
    dialCode: "+86",
    flag: "🇨🇳",
    example: "13800138000",
    minLength: 11,
    maxLength: 11,
    pattern: /^1[3-9]\d{9}$/,
    hint: "11 digits starting with 1",
  },
  {
    iso: "BD",
    name: "Bangladesh",
    dialCode: "+880",
    flag: "🇧🇩",
    example: "1712345678",
    minLength: 10,
    maxLength: 10,
    pattern: /^1[3-9]\d{8}$/,
    hint: "10 digits starting with 1 (e.g. 17, 18, 19)",
  },
  {
    iso: "LK",
    name: "Sri Lanka",
    dialCode: "+94",
    flag: "🇱🇰",
    example: "771234567",
    minLength: 9,
    maxLength: 9,
    pattern: /^7[0-9]\d{7}$/,
    hint: "9 digits starting with 7",
  },
  {
    iso: "PK",
    name: "Pakistan",
    dialCode: "+92",
    flag: "🇵🇰",
    example: "3001234567",
    minLength: 10,
    maxLength: 10,
    pattern: /^3\d{9}$/,
    hint: "10 digits starting with 3",
  },
  {
    iso: "BT",
    name: "Bhutan",
    dialCode: "+975",
    flag: "🇧🇹",
    example: "17123456",
    minLength: 8,
    maxLength: 8,
    pattern: /^[17]\d{7}$/,
    hint: "8 digits starting with 17 or 77",
  },
  {
    iso: "TH",
    name: "Thailand",
    dialCode: "+66",
    flag: "🇹🇭",
    example: "812345678",
    minLength: 9,
    maxLength: 9,
    pattern: /^[689]\d{8}$/,
    hint: "9 digits starting with 6, 8, or 9",
  },
  {
    iso: "PH",
    name: "Philippines",
    dialCode: "+63",
    flag: "🇵🇭",
    example: "9171234567",
    minLength: 10,
    maxLength: 10,
    pattern: /^9\d{9}$/,
    hint: "10 digits starting with 9",
  },
  {
    iso: "DE",
    name: "Germany",
    dialCode: "+49",
    flag: "🇩🇪",
    example: "15123456789",
    minLength: 10,
    maxLength: 12,
    pattern: /^[1-9]\d{9,11}$/,
    hint: "10-12 digits without leading zero",
  },
  {
    iso: "KW",
    name: "Kuwait",
    dialCode: "+965",
    flag: "🇰🇼",
    example: "91234567",
    minLength: 8,
    maxLength: 8,
    pattern: /^[569]\d{7}$/,
    hint: "8 digits starting with 5, 6, or 9",
  },
  {
    iso: "OM",
    name: "Oman",
    dialCode: "+968",
    flag: "🇴🇲",
    example: "91234567",
    minLength: 8,
    maxLength: 8,
    pattern: /^9\d{7}$/,
    hint: "8 digits starting with 9",
  },
  {
    iso: "BH",
    name: "Bahrain",
    dialCode: "+973",
    flag: "🇧🇭",
    example: "39123456",
    minLength: 8,
    maxLength: 8,
    pattern: /^[36]\d{7}$/,
    hint: "8 digits starting with 3 or 6",
  },
  {
    iso: "INTL",
    name: "Other Country",
    dialCode: "+",
    flag: "🌐",
    example: "1234567890",
    minLength: 6,
    maxLength: 15,
    pattern: /^\d{6,15}$/,
    hint: "6 to 15 digits international phone number",
  },
];

export const DEFAULT_COUNTRY = COUNTRIES[0]; // Nepal (+977)

export interface PhoneValidationResult {
  isValid: boolean;
  errorMessage: string | null;
  cleanedNumber: string;
  fullInternationalNumber: string;
  country: CountryPhoneConfig;
}

/**
 * Cleans phone input by stripping whitespace, dashes, brackets, and leading 0s if appropriate.
 */
export function cleanPhoneNumber(input: string): string {
  if (!input) return "";
  // Strip non-digit characters
  let digits = input.replace(/\D/g, "");
  // If user typed leading 0 for mobile (common in Nepal e.g. 09841... or UK 07911...), strip it if it exceeds min length
  return digits;
}

/**
 * Validates a phone number based on selected country config.
 */
export function validatePhoneNumber(
  input: string,
  countryIso: string = "NP"
): PhoneValidationResult {
  const country = COUNTRIES.find((c) => c.iso === countryIso) || DEFAULT_COUNTRY;
  
  if (!input || input.trim().length === 0) {
    return {
      isValid: false,
      errorMessage: `Phone number is required for ${country.name}.`,
      cleanedNumber: "",
      fullInternationalNumber: "",
      country,
    };
  }

  let cleaned = input.replace(/\D/g, "");

  // If number starts with country dial code (e.g. user pasted 9779841234567), strip the dial code
  const numericDialCode = country.dialCode.replace(/\D/g, "");
  if (numericDialCode && cleaned.startsWith(numericDialCode) && cleaned.length > country.maxLength) {
    cleaned = cleaned.slice(numericDialCode.length);
  }

  // If user included leading 0 in national number (e.g. 09841234567), strip it for standard comparison
  if (cleaned.startsWith("0") && cleaned.length === country.maxLength + 1) {
    cleaned = cleaned.slice(1);
  }

  if (cleaned.length === 0) {
    return {
      isValid: false,
      errorMessage: `Please enter valid numeric digits.`,
      cleanedNumber: "",
      fullInternationalNumber: "",
      country,
    };
  }

  if (cleaned.length < country.minLength) {
    return {
      isValid: false,
      errorMessage: `Too short: ${country.name} number requires at least ${country.minLength} digits (currently ${cleaned.length}).`,
      cleanedNumber: cleaned,
      fullInternationalNumber: `${country.dialCode} ${cleaned}`,
      country,
    };
  }

  if (cleaned.length > country.maxLength) {
    return {
      isValid: false,
      errorMessage: `Too long: ${country.name} number can have at most ${country.maxLength} digits (currently ${cleaned.length}).`,
      cleanedNumber: cleaned,
      fullInternationalNumber: `${country.dialCode} ${cleaned}`,
      country,
    };
  }

  if (!country.pattern.test(cleaned)) {
    return {
      isValid: false,
      errorMessage: `Invalid format: ${country.hint}.`,
      cleanedNumber: cleaned,
      fullInternationalNumber: `${country.dialCode} ${cleaned}`,
      country,
    };
  }

  return {
    isValid: true,
    errorMessage: null,
    cleanedNumber: cleaned,
    fullInternationalNumber: `${country.dialCode} ${cleaned}`,
    country,
  };
}

/**
 * Parses existing stored phone strings (e.g. "+977 9841234567", "+919876543210", or "9841234567")
 * into country ISO and clean national number.
 */
export function parseStoredPhoneNumber(storedValue: string): {
  countryIso: string;
  nationalNumber: string;
} {
  if (!storedValue) {
    return { countryIso: "NP", nationalNumber: "" };
  }

  const trimmed = storedValue.trim();

  // Look for matching dial code
  for (const c of COUNTRIES) {
    if (c.dialCode !== "+" && trimmed.startsWith(c.dialCode)) {
      const national = trimmed.slice(c.dialCode.length).replace(/\D/g, "");
      return { countryIso: c.iso, nationalNumber: national };
    }
  }

  // Check without the '+' sign (e.g., "9779841234567")
  for (const c of COUNTRIES) {
    const rawDial = c.dialCode.replace(/\D/g, "");
    if (rawDial && trimmed.startsWith(rawDial) && trimmed.length > c.maxLength) {
      const national = trimmed.slice(rawDial.length).replace(/\D/g, "");
      return { countryIso: c.iso, nationalNumber: national };
    }
  }

  // Default to Nepal with digits only
  return { countryIso: "NP", nationalNumber: trimmed.replace(/\D/g, "") };
}
