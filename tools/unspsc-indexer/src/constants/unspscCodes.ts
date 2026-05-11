/**
 * UNSPSC Code Definitions for Mutual Aid App
 *
 * This file defines the allowed UNSPSC codes for the mutual aid platform.
 * It includes material goods and peer support services, while excluding
 * all professional services that require licenses or payment.
 *
 * Based on:
 * - final-code-structure.md
 * - community-gathering-codes.md
 */

// ============================================================================
// PEER MUTUAL AID SERVICE CODES (Family 9315)
// ============================================================================

/**
 * Class 931515: Peer Emotional & Social Support
 */
export const PEER_EMOTIONAL_SUPPORT = {
  CLASS: 931515,
  LISTENING_SUPPORT: 93151501,
  GRIEF_SUPPORT: 93151502,
  PEER_COUNSELING: 93151503,
  SUPPORT_GROUPS: 93151504,
  CRISIS_HOTLINE: 93151505,
} as const;

/**
 * Class 931516: Peer Care & Daily Living Support
 */
export const PEER_CARE_SUPPORT = {
  CLASS: 931516,
  PERSONAL_CARE: 93151601,
  MEAL_PREP: 93151602,
  MEDICATION_REMINDERS: 93151603,
  ELDER_ACCOMPANIMENT: 93151604,
  DISABILITY_SUPPORT: 93151605,
} as const;

/**
 * Class 931517: Childcare & Youth Support (Cooperative)
 */
export const CHILDCARE_SUPPORT = {
  CLASS: 931517,
  BABYSITTING_SWAP: 93151701,
  PEER_TUTORING: 93151702,
  AFTER_SCHOOL: 93151703,
  PLAYDATE_COORDINATION: 93151704,
  YOUTH_MENTORING: 93151705,
} as const;

/**
 * Class 931518: Transportation & Accompaniment
 */
export const TRANSPORTATION_SUPPORT = {
  CLASS: 931518,
  RIDE_SHARING: 93151801,
  CARPOOLING: 93151802,
  MEDICAL_APPOINTMENT_RIDES: 93151803,
  ACCOMPANIMENT: 93151804,
  BIKE_BUDDY: 93151805,
} as const;

/**
 * Class 931519: Legal & Bureaucratic Navigation
 */
export const LEGAL_NAVIGATION = {
  CLASS: 931519,
  COURT_ACCOMPANIMENT: 93151901,
  KNOW_YOUR_RIGHTS: 93151902,
  PAPERWORK_HELP: 93151903,
  TRANSLATION_SERVICES: 93151904,
  BENEFITS_NAVIGATION: 93151905,
  IMMIGRATION_SUPPORT: 93151906,
} as const;

/**
 * Class 931520: Health Navigation & Support
 */
export const HEALTH_NAVIGATION = {
  CLASS: 931520,
  HEALTHCARE_NAVIGATION: 93152001,
  APPOINTMENT_BOOKING: 93152002,
  MEDICAL_ADVOCACY: 93152003,
  INSURANCE_HELP: 93152004,
  PRESCRIPTION_PICKUP: 93152005,
} as const;

/**
 * Class 931521: Home & Repair Support (Peer)
 */
export const HOME_REPAIR_SUPPORT = {
  CLASS: 931521,
  BASIC_REPAIRS: 93152101,
  TOOL_SHARING: 93152102,
  REPAIR_SKILL_SHARING: 93152103,
  CLEANING_HELP: 93152104,
  MOVING_ASSISTANCE: 93152105,
} as const;

/**
 * Class 931522: Food & Meal Support
 */
export const FOOD_SUPPORT = {
  CLASS: 931522,
  MEAL_TRAIN: 93152201,
  COMMUNITY_COOKING: 93152202,
  GROCERY_SHOPPING: 93152203,
  FOOD_PRESERVATION: 93152204,
  COOKING_SKILL_SHARING: 93152205,
} as const;

/**
 * Class 931523: Skills & Knowledge Sharing
 */
export const SKILLS_SHARING = {
  CLASS: 931523,
  SKILL_SHARING: 93152301,
  TECH_HELP: 93152302,
  LANGUAGE_EXCHANGE: 93152303,
  STUDY_CIRCLES: 93152304,
  JOB_SEARCH_SUPPORT: 93152305,
  FINANCIAL_LITERACY: 93152306,
} as const;

/**
 * Class 931524: Safety & Protection (Community)
 */
export const SAFETY_SUPPORT = {
  CLASS: 931524,
  SAFETY_ESCORT: 93152401,
  COMMUNITY_WATCH: 93152402,
  EMERGENCY_CONTACT: 93152403,
  PET_CARE_SWAP: 93152404,
} as const;

/**
 * Class 931525: Harm Reduction Services & Supplies
 */
export const HARM_REDUCTION = {
  CLASS: 931525,
  HARM_REDUCTION_SUPPLIES: 93152501,
  SAFE_CONSUMPTION: 93152502,
  OVERDOSE_PREVENTION: 93152503,
  SYRINGE_EXCHANGE: 93152504,
  NALOXONE_DISTRIBUTION: 93152505,
  DRUG_CHECKING: 93152506,
  WOUND_CARE: 93152507,
  SAFER_SEX_SUPPLIES: 93152508,
  FENTANYL_TEST_STRIPS: 93152509,
  PEER_COUNSELING_SUD: 93152510,
} as const;

/**
 * Class 931526: Street Medicine & Outreach
 */
export const STREET_MEDICINE = {
  CLASS: 931526,
  STREET_OUTREACH: 93152601,
  BASIC_FIRST_AID: 93152602,
  HYGIENE_ACCESS: 93152603,
  WELLNESS_CHECKS: 93152604,
  RESOURCE_CONNECTION: 93152605,
} as const;

/**
 * Class 931527: Criminalized Communities Support
 */
export const CRIMINALIZED_SUPPORT = {
  CLASS: 931527,
  JAIL_SUPPORT: 93152701,
  EMERGENCY_FUNDS: 93152702,
  COMMISSARY_SUPPORT: 93152703,
  FAMILY_CONNECTION: 93152704,
  REENTRY_SUPPORT: 93152705,
} as const;

/**
 * Class 931528: Reproductive Justice
 */
export const REPRODUCTIVE_JUSTICE = {
  CLASS: 931528,
  ABORTION_ACCESS: 93152801,
  PREGNANCY_SUPPORT: 93152802,
  CHILDCARE_FOR_APPOINTMENTS: 93152803,
  MENSTRUAL_PRODUCTS: 93152804,
  BIRTH_SUPPORT: 93152805,
} as const;

/**
 * Class 931529: Disability Justice
 */
export const DISABILITY_JUSTICE = {
  CLASS: 931529,
  MOBILITY_AID_SHARING: 93152901,
  ACCESSIBILITY_CONSULTING: 93152902,
  PEER_ATTENDANT_CARE: 93152903,
  DISABILITY_ADVOCACY: 93152904,
  ACCESSIBLE_TRANSPORT: 93152905,
} as const;

/**
 * Class 931530: Community Gathering & Social Spaces ⭐ NEW
 */
export const COMMUNITY_GATHERING = {
  CLASS: 931530,
  POTLUCK_DINNER: 93153001,
  OPEN_HOUSE: 93153002,
  SOCIAL_EVENT_HOSTING: 93153003,
  COMMUNITY_SPACE_ACCESS: 93153004,
  HOLIDAY_GATHERING: 93153005,
  COMMUNITY_KITCHEN: 93153006,
  CELEBRATION_RITUAL_SPACE: 93153007,
  KIDS_SOCIAL_PLAY: 93153008,
  COMMUNITY_LIBRARY: 93153009,
  COMMUNITY_MEETING_SPACE: 93153010,
} as const;

/**
 * Class 931531: Connection & Anti-Isolation ⭐ NEW
 */
export const CONNECTION_SUPPORT = {
  CLASS: 931531,
  COMPANIONSHIP: 93153101,
  NEW_AREA_WELCOMING: 93153102,
  REGULAR_CHECKINS: 93153103,
  GROUP_ACTIVITY: 93153104,
} as const;

// ============================================================================
// MATERIAL GOODS SEGMENTS (Allowed segments)
// ============================================================================

export const ALLOWED_MATERIAL_SEGMENTS = {
  PET_PRODUCTS: 10,           // Pet PRODUCTS (food, supplies) - NOT services
  TRANSPORT_PRODUCTS: 25,     // Transportation PRODUCTS (bikes, parts) - NOT services
  TOOLS_HARDWARE: 31,         // Tools & hardware
  ELECTRICAL_SUPPLIES: 39,    // Electrical supplies (bulbs, batteries)
  MEDICAL_SUPPLIES: 42,       // Medical SUPPLIES (mobility aids, first aid) - NOT services
  IT_EQUIPMENT: 43,           // IT equipment (phones, computers, chargers)
  MUSICAL_INSTRUMENTS: 45,    // Musical instruments
  CLIMATE_CONTROL: 46,        // Climate control (fans, heaters)
  ARTS_CRAFTS: 47,           // Arts & crafts supplies
  SPORTS_TOYS: 48,           // Sports & toys
  BABY_PRODUCTS: 49,         // Baby products
  FOOD_BEVERAGE: 50,         // Food & beverage PRODUCTS
  CLOTHING_APPAREL: 53,      // Clothing & apparel
  BOOKS_MEDIA: 55,           // Books & media
  EDUCATIONAL_SUPPLIES: 60,  // Educational SUPPLIES (not teaching services)
  HOUSEHOLD_SUPPLIES: 72,    // Household supplies (hygiene, cleaning, furniture)
} as const;



// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================



/**
 * Get a helpful error message for removed codes with peer alternatives
 * @param unspsc The rejected UNSPSC code
 * @returns Helpful message with peer alternative suggestions
 */
export function getRejectionMessage(unspsc: number): string {
  const code = unspsc.toString();

  // Professional healthcare → Peer support
  if (/^85/.test(code)) {
    return 'Professional healthcare services are not allowed. Use peer emotional support (93151501), peer care assistance (93151601-93151605), or health navigation (93152001).';
  }

  // Legal services → Legal navigation
  if (/^82/.test(code)) {
    return 'Professional legal services are not allowed. Use court accompaniment (93151901), Know Your Rights (93151902), or paperwork help (93151903).';
  }

  // Financial services → Financial literacy
  if (/^84/.test(code)) {
    return 'Professional financial services are not allowed. Use financial literacy (93152306), paperwork help (93151903), or emergency funds (93152702).';
  }

  // Transportation services → Peer rides
  if (/^78(10|11)/.test(code)) {
    return 'Commercial transportation services are not allowed. Use ride sharing (93151801), carpooling (93151802), medical appointment rides (93151803), or moving assistance (93152105).';
  }

  // Education services → Peer teaching
  if (/^83(10|11|12)/.test(code)) {
    return 'Professional education services are not allowed. Use peer tutoring (93151702), skill sharing (93152301), or study circles (93152304).';
  }

  // Home services → Peer repairs
  if (/^7215250/.test(code) || /^72161/.test(code)) {
    return 'Licensed home services are not allowed. Use basic home repairs (93152101), tool sharing (93152102), or repair skill sharing (93152103).';
  }

  // Pet services → Pet care swap
  if (/^1020/.test(code)) {
    return 'Professional pet services are not allowed. Use pet care swap (93152401) or skill sharing (93152301).';
  }

  // Beauty services → Skill sharing
  if (/^7410/.test(code)) {
    return 'Professional beauty services are not allowed. Use skill sharing (93152301) for peer hair cutting, etc.';
  }

  // Food services → Community cooking
  if (/^90(10|11)/.test(code)) {
    return 'Commercial food services are not allowed. Use meal train/delivery (93152201), community cooking (93152202), or food as a product (50201xxx).';
  }

  // Professional care → Peer care
  if (/^931[234]/.test(code)) {
    return 'Professional care services are not allowed. Use peer care assistance (93151601), babysitting swap (93151701), or job search support (93152305).';
  }

  return 'This professional service code is not allowed. Please use peer mutual aid codes (9315xx) for services, or material goods codes for physical items.';
}

/**
 * Get the segment number from a UNSPSC code
 * @param unspsc The UNSPSC code
 * @returns The segment number (first 2 digits)
 */
export function getSegment(unspsc: number): number {
  return Math.floor(unspsc / 1000000);
}

/**
 * Get the family number from a UNSPSC code
 * @param unspsc The UNSPSC code
 * @returns The family number (first 4 digits)
 */
export function getFamily(unspsc: number): number {
  return Math.floor(unspsc / 10000);
}

/**
 * Get the class number from a UNSPSC code
 * @param unspsc The UNSPSC code
 * @returns The class number (first 6 digits)
 */
export function getClass(unspsc: number): number {
  return Math.floor(unspsc / 100);
}

/**
 * Check if a UNSPSC code is a peer mutual aid service (family 9315)
 * @param unspsc The UNSPSC code
 * @returns true if it's a peer mutual aid service
 */
export function isPeerMutualAid(unspsc: number): boolean {
  return getFamily(unspsc) === 9315;
}

/**
 * Check if a UNSPSC code is a material good
 * @param unspsc The UNSPSC code
 * @returns true if it's from an allowed material goods segment
 */
export function isMaterialGood(unspsc: number): boolean {
  const segment = getSegment(unspsc);
  return (Object.values(ALLOWED_MATERIAL_SEGMENTS) as number[]).includes(segment);
}

// ============================================================================
// EXPORTS
// ============================================================================

/**
 * All peer mutual aid service codes grouped by class
 */
export const PEER_MUTUAL_AID_CODES = {
  EMOTIONAL_SUPPORT: PEER_EMOTIONAL_SUPPORT,
  CARE_SUPPORT: PEER_CARE_SUPPORT,
  CHILDCARE: CHILDCARE_SUPPORT,
  TRANSPORTATION: TRANSPORTATION_SUPPORT,
  LEGAL_NAVIGATION,
  HEALTH_NAVIGATION,
  HOME_REPAIR: HOME_REPAIR_SUPPORT,
  FOOD: FOOD_SUPPORT,
  SKILLS: SKILLS_SHARING,
  SAFETY: SAFETY_SUPPORT,
  HARM_REDUCTION,
  STREET_MEDICINE,
  CRIMINALIZED_SUPPORT,
  REPRODUCTIVE_JUSTICE,
  DISABILITY_JUSTICE,
  COMMUNITY_GATHERING,
  CONNECTION: CONNECTION_SUPPORT,
} as const;

/**
 * Get a user-friendly description of a UNSPSC code category
 */
export function getCodeDescription(unspsc: number): string {
  const classNum = getClass(unspsc);

  // Check peer mutual aid codes
  if (classNum === PEER_EMOTIONAL_SUPPORT.CLASS) return 'Peer Emotional & Social Support';
  if (classNum === PEER_CARE_SUPPORT.CLASS) return 'Peer Care & Daily Living Support';
  if (classNum === CHILDCARE_SUPPORT.CLASS) return 'Childcare & Youth Support';
  if (classNum === TRANSPORTATION_SUPPORT.CLASS) return 'Transportation & Accompaniment';
  if (classNum === LEGAL_NAVIGATION.CLASS) return 'Legal & Bureaucratic Navigation';
  if (classNum === HEALTH_NAVIGATION.CLASS) return 'Health Navigation & Support';
  if (classNum === HOME_REPAIR_SUPPORT.CLASS) return 'Home & Repair Support';
  if (classNum === FOOD_SUPPORT.CLASS) return 'Food & Meal Support';
  if (classNum === SKILLS_SHARING.CLASS) return 'Skills & Knowledge Sharing';
  if (classNum === SAFETY_SUPPORT.CLASS) return 'Safety & Protection';
  if (classNum === HARM_REDUCTION.CLASS) return 'Harm Reduction Services';
  if (classNum === STREET_MEDICINE.CLASS) return 'Street Medicine & Outreach';
  if (classNum === CRIMINALIZED_SUPPORT.CLASS) return 'Criminalized Communities Support';
  if (classNum === REPRODUCTIVE_JUSTICE.CLASS) return 'Reproductive Justice';
  if (classNum === DISABILITY_JUSTICE.CLASS) return 'Disability Justice';
  if (classNum === COMMUNITY_GATHERING.CLASS) return 'Community Gathering & Social Spaces';
  if (classNum === CONNECTION_SUPPORT.CLASS) return 'Connection & Anti-Isolation';

  // Check material goods segments
  const segment = getSegment(unspsc);
  if (segment === ALLOWED_MATERIAL_SEGMENTS.PET_PRODUCTS) return 'Pet Products';
  if (segment === ALLOWED_MATERIAL_SEGMENTS.TRANSPORT_PRODUCTS) return 'Transportation Products';
  if (segment === ALLOWED_MATERIAL_SEGMENTS.TOOLS_HARDWARE) return 'Tools & Hardware';
  if (segment === ALLOWED_MATERIAL_SEGMENTS.ELECTRICAL_SUPPLIES) return 'Electrical Supplies';
  if (segment === ALLOWED_MATERIAL_SEGMENTS.MEDICAL_SUPPLIES) return 'Medical Supplies';
  if (segment === ALLOWED_MATERIAL_SEGMENTS.IT_EQUIPMENT) return 'IT Equipment';
  if (segment === ALLOWED_MATERIAL_SEGMENTS.MUSICAL_INSTRUMENTS) return 'Musical Instruments';
  if (segment === ALLOWED_MATERIAL_SEGMENTS.CLIMATE_CONTROL) return 'Climate Control';
  if (segment === ALLOWED_MATERIAL_SEGMENTS.ARTS_CRAFTS) return 'Arts & Crafts Supplies';
  if (segment === ALLOWED_MATERIAL_SEGMENTS.SPORTS_TOYS) return 'Sports & Toys';
  if (segment === ALLOWED_MATERIAL_SEGMENTS.BABY_PRODUCTS) return 'Baby Products';
  if (segment === ALLOWED_MATERIAL_SEGMENTS.FOOD_BEVERAGE) return 'Food & Beverage Products';
  if (segment === ALLOWED_MATERIAL_SEGMENTS.CLOTHING_APPAREL) return 'Clothing & Apparel';
  if (segment === ALLOWED_MATERIAL_SEGMENTS.BOOKS_MEDIA) return 'Books & Media';
  if (segment === ALLOWED_MATERIAL_SEGMENTS.EDUCATIONAL_SUPPLIES) return 'Educational Supplies';
  if (segment === ALLOWED_MATERIAL_SEGMENTS.HOUSEHOLD_SUPPLIES) return 'Household Supplies';

  return 'Unknown Code';
}
