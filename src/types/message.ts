/**
 * TypeScript type definitions for mutual aid messages
 * Generated from MessageSchema.json
 */

// ============================================================================
// Message Types
// ============================================================================

export type MessageType =
  | 'NEED'
  | 'OFFER'
  | 'COORDINATION'
  | 'BROKER_ACCESS'
  | 'COMPLETION'
  | 'REVOCATION';

// ============================================================================
// Category Types
// ============================================================================

export type PrimaryCategory =
  | 'FOOD'
  | 'WATER'
  | 'SHELTER'
  | 'CLOTHING'
  | 'HYGIENE'
  | 'MEDICAL'
  | 'TRANSPORTATION'
  | 'CHILDCARE'
  | 'ELDERCARE'
  | 'SAFETY'
  | 'EMPLOYMENT'
  | 'EDUCATION'
  | 'FINANCIAL'
  | 'HOUSEHOLD'
  | 'COMMUNICATION'
  | 'SKILLS'
  | 'SOCIAL'
  | 'COORDINATION'
  | 'INFORMATION'
  | 'LEGAL_HELP'
  | 'DOCUMENTATION'
  | 'MENTAL_HEALTH'
  | 'PET_CARE'
  | 'OTHER';

export type PrecisionLevel = 'very_low' | 'low' | 'medium' | 'high';

export type TimePattern =
  | 'Immediate'
  | 'Today'
  | 'Tomorrow'
  | 'This_week'
  | 'Next_week'
  | 'Specific_days'
  | 'Recurring'
  | 'Flexible';

export type DayOfWeek = 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun';

export type TimeBlock =
  | 'Early_morning_6-9'
  | 'Morning_9-12'
  | 'Midday_12-15'
  | 'Afternoon_15-18'
  | 'Evening_18-21'
  | 'Night_21-24';

export type RecurrenceFrequency = 'Daily' | 'Weekly' | 'Biweekly' | 'Monthly';

export type RecurrenceDuration = 'Ongoing' | 'Limited_time';

export type QuantityLevel =
  | 'Single_instance'
  | 'Small_amount'
  | 'Medium_amount'
  | 'Large_amount'
  | 'Bulk'
  | 'Ongoing_supply';

export type RecurrencePattern = 'One_time' | 'Weekly' | 'Biweekly' | 'Monthly' | 'Ongoing';

export type PayloadHint =
  | 'for_coordination'
  | 'for_broker'
  | 'for_helper'
  | 'for_requester'
  | 'for_offerer'
  | null;

export type MessagePriority = 'low' | 'normal' | 'high';

// ============================================================================
// Category-Specific Attribute Types
// ============================================================================

export type DietaryRestriction =
  | 'No_restriction'
  | 'Vegetarian'
  | 'Vegan'
  | 'Halal'
  | 'Kosher'
  | 'Gluten_free'
  | 'Dairy_free'
  | 'Nut_free'
  | 'Allergy_specific'
  | 'Diabetic_friendly'
  | 'Low_sodium';

export type FoodPreparation =
  | 'Ready_to_eat'
  | 'Needs_heating'
  | 'Raw_ingredients'
  | 'Shelf_stable'
  | 'Refrigeration_needed'
  | 'Frozen';

export type FoodPortion = 'Individual' | 'Family_small_2-4' | 'Family_large_5plus' | 'Bulk';

export interface FoodAttributes {
  dietary?: DietaryRestriction[];
  preparation?: FoodPreparation[];
  portion?: FoodPortion;
}

export type TransportDistance =
  | 'Within_neighborhood'
  | 'Cross_town'
  | 'To_nearby_city'
  | 'Long_distance';

export type TransportAccessibility =
  | 'Wheelchair_accessible'
  | 'Car_seat_needed'
  | 'Bike_trailer'
  | 'Walking_only'
  | 'Pet_friendly';

export type TransportPurpose =
  | 'Medical_appointment'
  | 'Work_commute'
  | 'Grocery_shopping'
  | 'School_transport'
  | 'General_errand'
  | 'Airport'
  | 'Emergency';

export interface TransportationAttributes {
  distance?: TransportDistance;
  accessibility?: TransportAccessibility[];
  purpose?: TransportPurpose;
}

export interface ClothingAttributes {
  size?: string[];
  gender?: 'Any' | 'Masculine_cut' | 'Feminine_cut';
  season?: 'Summer' | 'Winter' | 'All_season';
  condition?: 'New_with_tags' | 'Like_new' | 'Gently_used' | 'Well_worn_functional';
}

export interface CoordinationAttributes {
  space_type?: string[];
  capacity?: string[];
  facilitator_role?: string[];
  languages?: string[];
  hours?: string;
}

// Generic type for all category attributes
export type CategoryAttributes =
  | FoodAttributes
  | TransportationAttributes
  | ClothingAttributes
  | CoordinationAttributes
  | Record<string, unknown>;

// ============================================================================
// Message Structure Types
// ============================================================================

export interface Category {
  primary: PrimaryCategory;
  secondary?: string[];
  attributes?: CategoryAttributes;
}

export interface Location {
  coords: string; // Format: "lat±precision,lon±precision"
  precision_level?: PrecisionLevel;
}

export interface TimeWindow {
  days?: DayOfWeek[];
  time_blocks?: TimeBlock[];
}

export interface Recurrence {
  frequency?: RecurrenceFrequency;
  duration?: RecurrenceDuration;
  expires?: string | null; // ISO 8601 date-time
}

export interface Time {
  pattern?: TimePattern;
  windows?: TimeWindow[];
  recurrence?: Recurrence;
}

export interface PublicMessageData {
  category?: Category;
  location?: Location;
  time?: Time;
  quantity?: QuantityLevel;
  recurrence_pattern?: RecurrencePattern;
  note?: string | null;
}

export interface EncryptedPayload {
  recipient_key: string; // Base64-encoded public key
  nonce: string; // Base64-encoded nonce
  payload: string; // Base64-encoded encrypted data
  payload_size: number; // Size in bytes (must be multiple of 256)
  hint?: PayloadHint;
}

export interface MessageMetadata {
  relay_eligible?: boolean;
  expires_at?: string | null; // ISO 8601 date-time
  priority?: MessagePriority;
  createdLocally?: boolean; // Internal flag, not in schema
}

// ============================================================================
// Main Message Type
// ============================================================================

export interface MutualAidMessage {
  message_id: string; // UUID
  version: number;
  type: MessageType;
  timestamp: string; // ISO 8601 date-time
  in_response_to?: string | null; // UUID
  hop_count?: number;
  public: PublicMessageData;
  coordination_key?: string; // Base64-encoded public key
  encrypted_payloads?: EncryptedPayload[];
  metadata?: MessageMetadata;
}

// ============================================================================
// Encrypted Payload Content Types (not transmitted, for local use)
// ============================================================================

export interface LocationDetails {
  precision?: 'high' | 'very_high';
  coords?: string; // Precise coordinates
  identifiers?: {
    building?: string | null;
    floor?: string | null;
    unit?: string | null;
  };
  map_pin?: {
    coords: string;
    description: string;
  };
  access_notes?: string[];
}

export interface TimeDetails {
  specific_date?: string;
  specific_windows?: Array<{
    start: string;
    end: string;
    timezone?: string;
  }>;
  flexibility?: string;
  last_minute_changes?: string;
}

export interface CoordinationNotes {
  meeting_type?: string[];
  access_requirements?: string[];
  identification?: string[];
  language?: string[];
  bring_helper?: string;
}

export interface DecryptedPayloadContent {
  location_details?: LocationDetails;
  time_details?: TimeDetails;
  contact_name?: string | null;
  name_type?: string;
  how_to_address?: string;
  coordination_notes?: CoordinationNotes;
  responder_type?: 'OFFER' | 'BROKER' | 'ALTERNATIVE';
  message?: string;
  my_coordination_key?: string;
  grant_access?: boolean | 'observe_only' | 'full_mediation';
  conversation_keys?: {
    my_private_key?: string;
    their_public_key?: string;
  };
  context?: string;
  role?: string;
  confirmation?: boolean;
  acceptance?: boolean;
  chosen_time?: string;
}

// ============================================================================
// Completion Message Types
// ============================================================================

export interface CompletionSummary {
  category: string;
  area: string; // Coordinates with very low precision
  time: 'Today' | 'Yesterday' | 'This_week' | 'Recently';
  multiple_helpers?: boolean;
}

export interface CompletionMessage extends MutualAidMessage {
  type: 'COMPLETION';
  related_to: string; // Original request/offer message ID
  anonymous_summary: CompletionSummary;
}

// ============================================================================
// Type Guards
// ============================================================================

export function isNeedMessage(message: MutualAidMessage): message is MutualAidMessage {
  return message.type === 'NEED';
}

export function isOfferMessage(message: MutualAidMessage): message is MutualAidMessage {
  return message.type === 'OFFER';
}

export function isCoordinationMessage(message: MutualAidMessage): message is MutualAidMessage {
  return message.type === 'COORDINATION';
}

export function isCompletionMessage(message: MutualAidMessage): message is CompletionMessage {
  return message.type === 'COMPLETION';
}

// ============================================================================
// Helper Types for Message Creation
// ============================================================================

export interface CreateMessageParams {
  type: MessageType;
  category: PrimaryCategory;
  secondary?: string[];
  attributes?: CategoryAttributes;
  location: { lat: number; lon: number };
  time?: Time;
  quantity?: QuantityLevel;
  recurrence_pattern?: RecurrencePattern;
  inResponseTo?: string;
}
