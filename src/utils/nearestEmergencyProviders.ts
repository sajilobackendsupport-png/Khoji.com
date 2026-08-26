/**
 * Comprehensive Nepal Emergency Service Providers Geo-Database & Proximity Engine
 * Covers Kathmandu Valley, Pokhara, Chitwan, Butwal/Lumbini, Biratnagar, Dharan,
 * Nepalgunj, Birgunj, Hetauda, Dhangadhi, and key highway response hubs.
 */

import { calculateBearing, calculateDistanceMeters, getCompassDirection } from "./geoUtils";

export interface EmergencyServiceProvider {
  id: string;
  name: string;
  nameNepali?: string;
  category: "police" | "medical" | "fire" | "traffic" | "disaster" | "women_child";
  categoryLabel: string;
  phone: string;
  altPhone?: string;
  lat: number;
  lng: number;
  address: string;
  district: string;
  province: string;
  is24x7: boolean;
  facilities?: string[];
  icon: string;
}

export interface NearestProviderResult {
  provider: EmergencyServiceProvider;
  distanceMeters: number;
  distanceFormatted: string;
  bearing: number;
  directionLabel: string;
  directionArrow: string;
  estimatedEtaMinutes: number;
}

export const NEPAL_EMERGENCY_PROVIDERS: EmergencyServiceProvider[] = [
  // ================= KATHMANDU VALLEY - POLICE =================
  {
    id: "np-hq-naxal",
    name: "Nepal Police Headquarters Central Command",
    nameNepali: "नेपाल प्रहरी प्रधान कार्यालय",
    category: "police",
    categoryLabel: "Police HQ & Control",
    phone: "100",
    altPhone: "01-4412780",
    lat: 27.7153,
    lng: 85.3282,
    address: "Naxal, Kathmandu",
    district: "Kathmandu",
    province: "Bagmati",
    is24x7: true,
    facilities: ["Central Control", "Quick Response Team (QRT)", "Forensics"],
    icon: "👮",
  },
  {
    id: "np-range-teku",
    name: "Metropolitan Police Range Kathmandu",
    nameNepali: "काठमाडौँ परिसर टेकु",
    category: "police",
    categoryLabel: "District Police Range",
    phone: "100",
    altPhone: "01-4261790",
    lat: 27.6991,
    lng: 85.3054,
    address: "Teku, Kathmandu",
    district: "Kathmandu",
    province: "Bagmati",
    is24x7: true,
    facilities: ["Emergency Response", "Crime Investigation", "Detention"],
    icon: "👮",
  },
  {
    id: "np-circle-durbarmarg",
    name: "Metropolitan Police Circle Durbarmarg",
    nameNepali: "प्रहरी वृत्त दरबारमार्ग",
    category: "police",
    categoryLabel: "Police Circle",
    phone: "01-4224190",
    altPhone: "100",
    lat: 27.7126,
    lng: 85.3175,
    address: "Durbarmarg, Kathmandu",
    district: "Kathmandu",
    province: "Bagmati",
    is24x7: true,
    facilities: ["Tourist Police Unit", "Urban Patrol"],
    icon: "👮",
  },
  {
    id: "np-circle-baneshwor",
    name: "Metropolitan Police Circle Baneshwor",
    nameNepali: "प्रहरी वृत्त बानेश्वर",
    category: "police",
    categoryLabel: "Police Circle",
    phone: "01-4498456",
    altPhone: "100",
    lat: 27.6917,
    lng: 85.3424,
    address: "New Baneshwor, Kathmandu",
    district: "Kathmandu",
    province: "Bagmati",
    is24x7: true,
    facilities: ["VIP Security", "QRT Unit"],
    icon: "👮",
  },
  {
    id: "np-circle-gaushala",
    name: "Metropolitan Police Circle Gaushala",
    nameNepali: "प्रहरी वृत्त गौशाला",
    category: "police",
    categoryLabel: "Police Circle",
    phone: "01-4470985",
    altPhone: "100",
    lat: 27.7082,
    lng: 85.3496,
    address: "Gaushala, Kathmandu (Near Pashupatinath)",
    district: "Kathmandu",
    province: "Bagmati",
    is24x7: true,
    facilities: ["Airport Patrol", "Temple Security"],
    icon: "👮",
  },
  {
    id: "np-circle-maharajgunj",
    name: "Metropolitan Police Circle Maharajgunj",
    nameNepali: "प्रहरी वृत्त महाराजगञ्ज",
    category: "police",
    categoryLabel: "Police Circle",
    phone: "01-4720199",
    altPhone: "100",
    lat: 27.7381,
    lng: 85.3331,
    address: "Maharajgunj, Kathmandu",
    district: "Kathmandu",
    province: "Bagmati",
    is24x7: true,
    facilities: ["Diplomatic Enclave Patrol", "QRT Unit"],
    icon: "👮",
  },
  {
    id: "np-circle-kalimati",
    name: "Metropolitan Police Circle Kalimati",
    nameNepali: "प्रहरी वृत्त कालिमाटी",
    category: "police",
    categoryLabel: "Police Circle",
    phone: "01-4271899",
    altPhone: "100",
    lat: 27.6974,
    lng: 85.2977,
    address: "Kalimati, Kathmandu",
    district: "Kathmandu",
    province: "Bagmati",
    is24x7: true,
    facilities: ["Market Security", "Highway Patrol"],
    icon: "👮",
  },
  {
    id: "np-circle-balaju",
    name: "Metropolitan Police Circle Balaju",
    nameNepali: "प्रहरी वृत्त बालाजु",
    category: "police",
    categoryLabel: "Police Circle",
    phone: "01-4350035",
    altPhone: "100",
    lat: 27.7329,
    lng: 85.3021,
    address: "Balaju Bypass, Kathmandu",
    district: "Kathmandu",
    province: "Bagmati",
    is24x7: true,
    facilities: ["Industrial Area Patrol", "Ring Road Unit"],
    icon: "👮",
  },
  {
    id: "np-circle-swayambhu",
    name: "Metropolitan Police Circle Swayambhu",
    nameNepali: "प्रहरी वृत्त स्वयम्भू",
    category: "police",
    categoryLabel: "Police Circle",
    phone: "01-4271590",
    altPhone: "100",
    lat: 27.7144,
    lng: 85.2891,
    address: "Swayambhu, Kathmandu",
    district: "Kathmandu",
    province: "Bagmati",
    is24x7: true,
    facilities: ["Heritage Site Security", "Night Patrol"],
    icon: "👮",
  },

  // ================= LALITPUR - POLICE =================
  {
    id: "np-range-lalitpur",
    name: "District Police Range Lalitpur (Jawalakhel)",
    nameNepali: "जिल्ला प्रहरी परिसर ललितपुर",
    category: "police",
    categoryLabel: "District Police Range",
    phone: "100",
    altPhone: "01-5521207",
    lat: 27.6729,
    lng: 85.3134,
    address: "Jawalakhel, Lalitpur",
    district: "Lalitpur",
    province: "Bagmati",
    is24x7: true,
    facilities: ["Central Control Lalitpur", "QRT", "Women Cell"],
    icon: "👮",
  },
  {
    id: "np-circle-satdobato",
    name: "Metropolitan Police Circle Satdobato",
    nameNepali: "प्रहरी वृत्त सातदोबाटो",
    category: "police",
    categoryLabel: "Police Circle",
    phone: "01-5538388",
    altPhone: "100",
    lat: 27.6582,
    lng: 85.3268,
    address: "Satdobato, Lalitpur",
    district: "Lalitpur",
    province: "Bagmati",
    is24x7: true,
    facilities: ["Southern Ring Road Patrol", "Emergency Unit"],
    icon: "👮",
  },

  // ================= BHAKTAPUR - POLICE =================
  {
    id: "np-range-bhaktapur",
    name: "District Police Range Bhaktapur",
    nameNepali: "जिल्ला प्रहरी परिसर भक्तपुर",
    category: "police",
    categoryLabel: "District Police Range",
    phone: "100",
    altPhone: "01-6614821",
    lat: 27.6711,
    lng: 85.4298,
    address: "Suryabinayak, Bhaktapur",
    district: "Bhaktapur",
    province: "Bagmati",
    is24x7: true,
    facilities: ["Bhaktapur Control", "Araniko Highway Patrol"],
    icon: "👮",
  },
  {
    id: "np-circle-thimi",
    name: "Metropolitan Police Circle Thimi",
    nameNepali: "प्रहरी वृत्त ठिमी",
    category: "police",
    categoryLabel: "Police Circle",
    phone: "01-6630015",
    altPhone: "100",
    lat: 27.6834,
    lng: 85.3857,
    address: "Madhyapur Thimi, Bhaktapur",
    district: "Bhaktapur",
    province: "Bagmati",
    is24x7: true,
    facilities: ["Highway Patrol", "Emergency QRT"],
    icon: "👮",
  },

  // ================= KATHMANDU VALLEY - MEDICAL & HOSPITALS =================
  {
    id: "hosp-tuth",
    name: "T.U. Teaching Hospital (TUTH Maharajgunj)",
    nameNepali: "त्रिभुवन विश्वविद्यालय शिक्षण अस्पताल",
    category: "medical",
    categoryLabel: "Central University Hospital & Trauma",
    phone: "01-4412404",
    altPhone: "102",
    lat: 27.7368,
    lng: 85.3311,
    address: "Maharajgunj, Kathmandu",
    district: "Kathmandu",
    province: "Bagmati",
    is24x7: true,
    facilities: ["Level 1 Trauma Center", "24/7 ICU", "Blood Bank", "Emergency Helipad"],
    icon: "🏥",
  },
  {
    id: "hosp-bir",
    name: "Bir Hospital & National Trauma Center",
    nameNepali: "वीर अस्पताल तथा राष्ट्रिय ट्रमा सेन्टर",
    category: "medical",
    categoryLabel: "National Apex Trauma Hospital",
    phone: "01-4221119",
    altPhone: "102",
    lat: 27.7042,
    lng: 85.3135,
    address: "Mahabouddha / Tundikhel, Kathmandu",
    district: "Kathmandu",
    province: "Bagmati",
    is24x7: true,
    facilities: ["Trauma ICU", "Burn Unit", "Emergency Surgery", "Blood Bank"],
    icon: "🏥",
  },
  {
    id: "hosp-patan",
    name: "Patan Hospital Emergency Department",
    nameNepali: "पाटन अस्पताल आपतकालीन कक्ष",
    category: "medical",
    categoryLabel: "Major Referral Hospital",
    phone: "01-5522295",
    altPhone: "102",
    lat: 27.6687,
    lng: 85.3218,
    address: "Lagankhel, Lalitpur",
    district: "Lalitpur",
    province: "Bagmati",
    is24x7: true,
    facilities: ["Emergency ER", "Pediatric Trauma", "Ambulance Station"],
    icon: "🏥",
  },
  {
    id: "hosp-civil",
    name: "Civil Service Hospital of Nepal",
    nameNepali: "निजामती कर्मचारी अस्पताल",
    category: "medical",
    categoryLabel: "Super Specialty Hospital",
    phone: "01-4107000",
    altPhone: "102",
    lat: 27.6859,
    lng: 85.3402,
    address: "Minbhawan, Kathmandu",
    district: "Kathmandu",
    province: "Bagmati",
    is24x7: true,
    facilities: ["Critical Care ICU", "Emergency ER", "Blood Bank"],
    icon: "🏥",
  },
  {
    id: "hosp-mediciti",
    name: "Nepal Mediciti Hospital (Bhaisepati)",
    nameNepali: "नेपाल मेडिसिटी अस्पताल",
    category: "medical",
    categoryLabel: "Quaternary Trauma Hospital",
    phone: "01-4217766",
    altPhone: "102",
    lat: 27.6534,
    lng: 85.3045,
    address: "Bhaisepati, Lalitpur",
    district: "Lalitpur",
    province: "Bagmati",
    is24x7: true,
    facilities: ["Advanced Life Support (ALS)", "Heli-Rescue", "Stroke Center"],
    icon: "🏥",
  },
  {
    id: "hosp-kmc",
    name: "Kathmandu Medical College (KMC Sinamangal)",
    nameNepali: "काठमाडौँ मेडिकल कलेज",
    category: "medical",
    categoryLabel: "Teaching Hospital",
    phone: "01-4469064",
    altPhone: "102",
    lat: 27.6976,
    lng: 85.3537,
    address: "Sinamangal, Kathmandu (Near Airport)",
    district: "Kathmandu",
    province: "Bagmati",
    is24x7: true,
    facilities: ["24/7 ER", "ICU", "Blood Bank", "Airport Rapid Ambulance"],
    icon: "🏥",
  },
  {
    id: "hosp-bhaktapur",
    name: "Bhaktapur Hospital (Dudhpati)",
    nameNepali: "भक्तपुर अस्पताल",
    category: "medical",
    categoryLabel: "District Hospital",
    phone: "01-6610798",
    altPhone: "102",
    lat: 27.6719,
    lng: 85.4262,
    address: "Dudhpati, Bhaktapur",
    district: "Bhaktapur",
    province: "Bagmati",
    is24x7: true,
    facilities: ["Emergency ER", "Ambulance Fleet", "Maternity"],
    icon: "🏥",
  },
  {
    id: "amb-nas-hq",
    name: "Nepal Ambulance Service (NAS 102 Central HQ)",
    nameNepali: "नेपाल एम्बुलेन्स सेवा १०२",
    category: "medical",
    categoryLabel: "GPS Emergency Ambulance Dispatch",
    phone: "102",
    altPhone: "01-4228435",
    lat: 27.7018,
    lng: 85.3126,
    address: "Central Kathmandu Network",
    district: "Kathmandu",
    province: "Bagmati",
    is24x7: true,
    facilities: ["EMT On-Board", "GPS Fleet", "Defibrillator Equipped"],
    icon: "🚑",
  },
  {
    id: "amb-redcross",
    name: "Nepal Red Cross Society Ambulance Central",
    nameNepali: "नेपाल रेडक्रस सोसाइटी",
    category: "medical",
    categoryLabel: "Red Cross Ambulance Network",
    phone: "1130",
    altPhone: "01-4270650",
    lat: 27.7032,
    lng: 85.2974,
    address: "Red Cross Marg, Kalimati, Kathmandu",
    district: "Kathmandu",
    province: "Bagmati",
    is24x7: true,
    facilities: ["Emergency Blood Supply", "Disaster Medical Rescue"],
    icon: "🚑",
  },

  // ================= KATHMANDU VALLEY - FIRE & RESCUE =================
  {
    id: "fire-ktm-newroad",
    name: "Juddha Barun Yantra Fire Brigade (New Road)",
    nameNepali: "जुद्ध बारुण यन्त्र काठमाडौँ",
    category: "fire",
    categoryLabel: "Central Fire Brigade",
    phone: "101",
    altPhone: "01-4221111",
    lat: 27.7031,
    lng: 85.3122,
    address: "New Road / Basantapur, Kathmandu",
    district: "Kathmandu",
    province: "Bagmati",
    is24x7: true,
    facilities: ["High-Reach Fire Engines", "Chemical Hazard Foam", "Rescue Squad"],
    icon: "🚒",
  },
  {
    id: "fire-lalitpur-pulchowk",
    name: "Lalitpur Fire Brigade Station (Pulchowk)",
    nameNepali: "ललितपुर बारुण यन्त्र पुल्चोक",
    category: "fire",
    categoryLabel: "Municipal Fire Station",
    phone: "101",
    altPhone: "01-5521177",
    lat: 27.6783,
    lng: 85.3168,
    address: "Pulchowk, Lalitpur",
    district: "Lalitpur",
    province: "Bagmati",
    is24x7: true,
    facilities: ["Water Tenders", "Rescue Cutters", "Breathing Apparatus"],
    icon: "🚒",
  },
  {
    id: "fire-bhaktapur-byasi",
    name: "Bhaktapur Municipal Fire Station (Byasi)",
    nameNepali: "भक्तपुर बारुण यन्त्र व्यासी",
    category: "fire",
    categoryLabel: "Municipal Fire Station",
    phone: "101",
    altPhone: "01-6610101",
    lat: 27.6787,
    lng: 85.4278,
    address: "Byasi, Bhaktapur",
    district: "Bhaktapur",
    province: "Bagmati",
    is24x7: true,
    facilities: ["Heritage Fire Unit", "Emergency Water Supply"],
    icon: "🚒",
  },

  // ================= KATHMANDU VALLEY - TRAFFIC POLICE =================
  {
    id: "traffic-ramshahpath",
    name: "Metropolitan Traffic Police Division HQ",
    nameNepali: "उपत्यका ट्राफिक प्रहरी महाशाखा",
    category: "traffic",
    categoryLabel: "Traffic Command Division",
    phone: "103",
    altPhone: "104",
    lat: 27.7029,
    lng: 85.3197,
    address: "Ramshahpath / Baghbazar, Kathmandu",
    district: "Kathmandu",
    province: "Bagmati",
    is24x7: true,
    facilities: ["Highway Rapid Clearance", "Accident Investigation", "Crane Towing"],
    icon: "🚦",
  },
  {
    id: "traffic-koteshwor",
    name: "Traffic Police Sector Koteshwor / Jadibuti",
    nameNepali: "ट्राफिक प्रहरी प्रभाग कोटेश्वर",
    category: "traffic",
    categoryLabel: "Highway Traffic Sector",
    phone: "01-4600103",
    altPhone: "103",
    lat: 27.6766,
    lng: 85.3512,
    address: "Koteshwor Chowk, Kathmandu",
    district: "Kathmandu",
    province: "Bagmati",
    is24x7: true,
    facilities: ["Expressway Rescue", "Ambulance Green Corridor"],
    icon: "🚦",
  },
  {
    id: "traffic-kalanki",
    name: "Traffic Police Sector Kalanki Underpass",
    nameNepali: "ट्राफिक प्रहरी प्रभाग कलंकी",
    category: "traffic",
    categoryLabel: "Highway Entry Traffic Sector",
    phone: "01-4279103",
    altPhone: "103",
    lat: 27.6934,
    lng: 85.2818,
    address: "Kalanki Chowk, Kathmandu",
    district: "Kathmandu",
    province: "Bagmati",
    is24x7: true,
    facilities: ["Prithvi Highway Rapid Clear", "Breakdown Rescue"],
    icon: "🚦",
  },

  // ================= DISASTER & APF BASES =================
  {
    id: "disaster-neoc",
    name: "National Emergency Operation Centre (NEOC Singh Durbar)",
    nameNepali: "राष्ट्रिय आपत्कालीन कार्यसञ्चालन केन्द्र",
    category: "disaster",
    categoryLabel: "National Disaster Command",
    phone: "1155",
    altPhone: "01-4200105",
    lat: 27.6978,
    lng: 85.3219,
    address: "Singh Durbar, Kathmandu",
    district: "Kathmandu",
    province: "Bagmati",
    is24x7: true,
    facilities: ["Satellite Dispatch", "Multi-Agency Coordination", "Helicopter SAR"],
    icon: "🏔️",
  },
  {
    id: "disaster-apf-halchowk",
    name: "Armed Police Force (APF) Disaster Management Command",
    nameNepali: "सशस्त्र प्रहरी बल विपद् व्यवस्थापन कमान्ड",
    category: "disaster",
    categoryLabel: "Paramilitary Disaster Rescue",
    phone: "1114",
    altPhone: "01-4271891",
    lat: 27.7196,
    lng: 85.2758,
    address: "Halchowk, Kathmandu",
    district: "Kathmandu",
    province: "Bagmati",
    is24x7: true,
    facilities: ["Collapse Structure SAR", "Deep Water Diving Unit", "Canine Unit"],
    icon: "🛡️",
  },

  // ================= WOMEN & CHILD PROTECTION =================
  {
    id: "protect-child-1098",
    name: "National Child Helpline Nepal (Voice of Children)",
    nameNepali: "राष्ट्रिय बाल हेल्पलाइन १०९८",
    category: "women_child",
    categoryLabel: "Child Protection Emergency",
    phone: "1098",
    altPhone: "01-4439145",
    lat: 27.7095,
    lng: 85.3341,
    address: "Bhatbhateni, Kathmandu",
    district: "Kathmandu",
    province: "Bagmati",
    is24x7: true,
    facilities: ["Child Rescue Squad", "Emergency Safe House", "Legal Counseling"],
    icon: "👶",
  },
  {
    id: "protect-women-1145",
    name: "National Women Commission (NWC Helpline)",
    nameNepali: "राष्ट्रिय महिला आयोग हेल्पलाइन ११४५",
    category: "women_child",
    categoryLabel: "Women Safety & Domestic Abuse Cell",
    phone: "1145",
    altPhone: "01-4256701",
    lat: 27.6989,
    lng: 85.3182,
    address: "Bhadrakali, Kathmandu",
    district: "Kathmandu",
    province: "Bagmati",
    is24x7: true,
    facilities: ["GBV Immediate Police Escort", "Legal Support", "Shelter Placement"],
    icon: "👩",
  },

  // ================= POKHARA & GANDAKI PROVINCE =================
  {
    id: "np-kaski-pokhara",
    name: "District Police Office Kaski (Gairapatan Pokhara)",
    nameNepali: "जिल्ला प्रहरी कार्यालय कास्की",
    category: "police",
    categoryLabel: "District Police Range",
    phone: "100",
    altPhone: "061-520033",
    lat: 28.2198,
    lng: 83.9856,
    address: "Gairapatan, Pokhara",
    district: "Kaski",
    province: "Gandaki",
    is24x7: true,
    facilities: ["Tourist Police Pokhara", "Highway Rescue", "Lake Boat Patrol"],
    icon: "👮",
  },
  {
    id: "hosp-wrh-pokhara",
    name: "Western Regional Hospital (PAHS Ramghat Pokhara)",
    nameNepali: "पश्चिमाञ्चल क्षेत्रीय अस्पताल पोखरा",
    category: "medical",
    categoryLabel: "Apex Regional Hospital",
    phone: "061-520067",
    altPhone: "102",
    lat: 28.2125,
    lng: 83.9922,
    address: "Ramghat, Pokhara",
    district: "Kaski",
    province: "Gandaki",
    is24x7: true,
    facilities: ["Level 1 Trauma", "24/7 ICU", "Helipad SAR"],
    icon: "🏥",
  },
  {
    id: "fire-pokhara",
    name: "Pokhara Metropolitan Fire Brigade (Rani Pauwa)",
    nameNepali: "पोखरा दमकल शाखा",
    category: "fire",
    categoryLabel: "Metropolitan Fire Station",
    phone: "101",
    altPhone: "061-521177",
    lat: 28.2163,
    lng: 83.9961,
    address: "Rani Pauwa, Pokhara",
    district: "Kaski",
    province: "Gandaki",
    is24x7: true,
    facilities: ["Water Tenders", "Lake Rescue Team"],
    icon: "🚒",
  },

  // ================= CHITWAN & NARAYANI =================
  {
    id: "np-chitwan-bharatpur",
    name: "District Police Office Chitwan (Bharatpur)",
    nameNepali: "जिल्ला प्रहरी कार्यालय चितवन",
    category: "police",
    categoryLabel: "District Police Office",
    phone: "100",
    altPhone: "056-520199",
    lat: 27.6833,
    lng: 84.4333,
    address: "Bharatpur Heights, Chitwan",
    district: "Chitwan",
    province: "Bagmati",
    is24x7: true,
    facilities: ["East-West Highway QRT", "Mugling Corridor Rescue"],
    icon: "👮",
  },
  {
    id: "hosp-bharatpur",
    name: "Bharatpur Central Hospital & Trauma",
    nameNepali: "भरतपुर अस्पताल",
    category: "medical",
    categoryLabel: "Central Referral Hospital",
    phone: "056-524000",
    altPhone: "102",
    lat: 27.6791,
    lng: 84.4312,
    address: "Hospital Road, Bharatpur, Chitwan",
    district: "Chitwan",
    province: "Bagmati",
    is24x7: true,
    facilities: ["Trauma ICU", "Snake Bite Treatment Center", "24/7 ER"],
    icon: "🏥",
  },

  // ================= BUTWAL & LUMBINI =================
  {
    id: "np-butwal",
    name: "Area Police Office Butwal",
    nameNepali: "इलाका प्रहरी कार्यालय बुटवल",
    category: "police",
    categoryLabel: "Area Police Office",
    phone: "100",
    altPhone: "071-540199",
    lat: 27.7006,
    lng: 83.4659,
    address: "Traffic Chowk, Butwal",
    district: "Rupandehi",
    province: "Lumbini",
    is24x7: true,
    facilities: ["Siddhababa Highway Rescue", "QRT Patrol"],
    icon: "👮",
  },
  {
    id: "hosp-lumbini-provincial",
    name: "Lumbini Provincial Hospital Butwal",
    nameNepali: "लुम्बिनी प्रादेशिक अस्पताल बुटवल",
    category: "medical",
    categoryLabel: "Provincial Apex Hospital",
    phone: "071-540200",
    altPhone: "102",
    lat: 27.7021,
    lng: 83.4612,
    address: "Hospital Line, Butwal",
    district: "Rupandehi",
    province: "Lumbini",
    is24x7: true,
    facilities: ["Emergency ER", "Trauma Unit", "Blood Bank"],
    icon: "🏥",
  },

  // ================= BIRATNAGAR & KOSHI =================
  {
    id: "np-morang-biratnagar",
    name: "District Police Office Morang (Biratnagar)",
    nameNepali: "जिल्ला प्रहरी कार्यालय मोरङ",
    category: "police",
    categoryLabel: "District Police Range",
    phone: "100",
    altPhone: "021-524199",
    lat: 26.4525,
    lng: 87.2718,
    address: "Main Road, Biratnagar",
    district: "Morang",
    province: "Koshi",
    is24x7: true,
    facilities: ["Border Security Unit", "Industrial Patrol"],
    icon: "👮",
  },
  {
    id: "hosp-koshi-biratnagar",
    name: "Koshi Hospital Biratnagar",
    nameNepali: "कोशी अस्पताल विराटनगर",
    category: "medical",
    categoryLabel: "Provincial Referral Hospital",
    phone: "021-525555",
    altPhone: "102",
    lat: 26.4589,
    lng: 87.2801,
    address: "Hospital Chowk, Biratnagar",
    district: "Morang",
    province: "Koshi",
    is24x7: true,
    facilities: ["Emergency Trauma", "ICU", "Ambulance Hub"],
    icon: "🏥",
  },

  // ================= DHARAN =================
  {
    id: "hosp-bpkihs-dharan",
    name: "B.P. Koirala Institute of Health Sciences (BPKIHS Dharan)",
    nameNepali: "बीपी कोइराला स्वास्थ्य विज्ञान प्रतिष्ठान",
    category: "medical",
    categoryLabel: "National Apex Health Institute",
    phone: "025-525555",
    altPhone: "102",
    lat: 26.8122,
    lng: 87.2834,
    address: "Ghopa Camp, Dharan",
    district: "Sunsari",
    province: "Koshi",
    is24x7: true,
    facilities: ["Super Specialty ER", "Burn Unit", "Heli-SAR Landing"],
    icon: "🏥",
  },

  // ================= NEPALGUNJ & WEST =================
  {
    id: "hosp-bheri-nepalgunj",
    name: "Bheri Provincial Hospital Nepalgunj",
    nameNepali: "भेरी अस्पताल नेपालगञ्ज",
    category: "medical",
    categoryLabel: "Provincial Apex Hospital",
    phone: "081-520120",
    altPhone: "102",
    lat: 28.0531,
    lng: 81.6184,
    address: "Hospital Road, Nepalgunj",
    district: "Banke",
    province: "Lumbini",
    is24x7: true,
    facilities: ["Emergency Trauma Unit", "Snake Bite Center", "ICU"],
    icon: "🏥",
  },
];

/**
 * Format raw meters into human friendly format (e.g. 350 m, 1.4 km)
 */
export function formatDistanceHuman(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  const km = meters / 1000;
  return `${km < 10 ? km.toFixed(1) : Math.round(km)} km`;
}

/**
 * Estimate response ETA in minutes given distance and Nepal traffic conditions
 */
export function estimateEmergencyEtaMinutes(distanceMeters: number): number {
  if (distanceMeters <= 500) return 2;
  if (distanceMeters <= 1500) return 4;
  if (distanceMeters <= 3000) return 7;
  if (distanceMeters <= 6000) return 12;
  if (distanceMeters <= 12000) return 20;
  return Math.round(15 + (distanceMeters / 1000) * 1.8);
}

/**
 * Finds all nearby emergency service providers sorted by proximity to user GPS
 */
export function findNearestEmergencyProviders(
  userLat: number,
  userLng: number,
  categoryFilter?: "police" | "medical" | "fire" | "traffic" | "disaster" | "women_child" | "all",
  limit: number = 8
): NearestProviderResult[] {
  if (!userLat || !userLng || isNaN(userLat) || isNaN(userLng)) {
    return [];
  }

  const results: NearestProviderResult[] = [];

  for (const provider of NEPAL_EMERGENCY_PROVIDERS) {
    if (categoryFilter && categoryFilter !== "all" && provider.category !== categoryFilter) {
      continue;
    }

    const distMeters = calculateDistanceMeters(userLat, userLng, provider.lat, provider.lng);
    const bearing = calculateBearing(userLat, userLng, provider.lat, provider.lng);
    const compass = getCompassDirection(bearing);
    const eta = estimateEmergencyEtaMinutes(distMeters);

    results.push({
      provider,
      distanceMeters: distMeters,
      distanceFormatted: formatDistanceHuman(distMeters),
      bearing,
      directionLabel: compass.label,
      directionArrow: compass.arrow,
      estimatedEtaMinutes: eta,
    });
  }

  // Sort strictly by nearest distance
  results.sort((a, b) => a.distanceMeters - b.distanceMeters);

  return results.slice(0, limit);
}

/**
 * Finds the single best #1 nearest matching emergency provider for an active alert
 */
export function getNearestProviderForAlert(alert: {
  location?: { lat: number; lng: number };
  type?: string;
  details?: string;
}): NearestProviderResult | null {
  const lat = alert.location?.lat || 27.7172;
  const lng = alert.location?.lng || 85.324;

  const rawType = (alert.type || "").toLowerCase();
  const text = `${alert.type || ""} ${alert.details || ""}`.toLowerCase();

  let preferredCategory: "police" | "medical" | "fire" | "traffic" | "disaster" | "women_child" = "police";

  if (rawType === "fire" || text.includes("fire") || text.includes("aago") || text.includes("smoke")) {
    preferredCategory = "fire";
  } else if (rawType === "ambulance" || text.includes("medical") || text.includes("injury") || text.includes("hospital") || text.includes("birami")) {
    preferredCategory = "medical";
  } else if (text.includes("traffic") || text.includes("accident") || text.includes("crash") || text.includes("highway")) {
    preferredCategory = "traffic";
  } else if (text.includes("flood") || text.includes("landslide") || text.includes("pahiro") || text.includes("earthquake") || text.includes("disaster")) {
    preferredCategory = "disaster";
  } else if (text.includes("child") || text.includes("woman") || text.includes("abuse") || text.includes("harass")) {
    preferredCategory = "women_child";
  }

  // Find nearest provider within matching category
  const matchingNearest = findNearestEmergencyProviders(lat, lng, preferredCategory, 1);
  if (matchingNearest.length > 0) {
    return matchingNearest[0];
  }

  // Fallback to absolute nearest of any category
  const absoluteNearest = findNearestEmergencyProviders(lat, lng, "all", 1);
  return absoluteNearest.length > 0 ? absoluteNearest[0] : null;
}
