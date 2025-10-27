/**
 * Category definitions with icons and metadata
 */

import { PrimaryCategory } from '../types/message';

export interface CategoryInfo {
  key: PrimaryCategory;
  label: string;
  icon: string;
  description: string;
}

export const CATEGORIES: Record<PrimaryCategory, CategoryInfo> = {
  FOOD: {
    key: 'FOOD',
    label: 'Food',
    icon: '🍽️',
    description: 'Meals, groceries, or food assistance',
  },
  WATER: {
    key: 'WATER',
    label: 'Water',
    icon: '💧',
    description: 'Drinking water or water access',
  },
  SHELTER: {
    key: 'SHELTER',
    label: 'Shelter',
    icon: '🏠',
    description: 'Temporary or long-term housing',
  },
  CLOTHING: {
    key: 'CLOTHING',
    label: 'Clothing',
    icon: '👕',
    description: 'Clothes, shoes, or accessories',
  },
  HYGIENE: {
    key: 'HYGIENE',
    label: 'Hygiene',
    icon: '🧼',
    description: 'Personal hygiene products',
  },
  MEDICAL: {
    key: 'MEDICAL',
    label: 'Medical',
    icon: '🏥',
    description: 'Medical care or supplies',
  },
  TRANSPORTATION: {
    key: 'TRANSPORTATION',
    label: 'Transportation',
    icon: '🚗',
    description: 'Rides or transport assistance',
  },
  CHILDCARE: {
    key: 'CHILDCARE',
    label: 'Childcare',
    icon: '👶',
    description: 'Childcare or supervision',
  },
  ELDERCARE: {
    key: 'ELDERCARE',
    label: 'Eldercare',
    icon: '👴',
    description: 'Elder care or assistance',
  },
  SAFETY: {
    key: 'SAFETY',
    label: 'Safety',
    icon: '🛡️',
    description: 'Safety or protection assistance',
  },
  EMPLOYMENT: {
    key: 'EMPLOYMENT',
    label: 'Employment',
    icon: '💼',
    description: 'Job opportunities or work help',
  },
  EDUCATION: {
    key: 'EDUCATION',
    label: 'Education',
    icon: '📚',
    description: 'Learning, tutoring, or education',
  },
  FINANCIAL: {
    key: 'FINANCIAL',
    label: 'Financial',
    icon: '💰',
    description: 'Financial assistance or advice',
  },
  HOUSEHOLD: {
    key: 'HOUSEHOLD',
    label: 'Household',
    icon: '🏡',
    description: 'Household items or repairs',
  },
  COMMUNICATION: {
    key: 'COMMUNICATION',
    label: 'Communication',
    icon: '📱',
    description: 'Phone, internet, or communication',
  },
  SKILLS: {
    key: 'SKILLS',
    label: 'Skills',
    icon: '🔧',
    description: 'Skills sharing or training',
  },
  SOCIAL: {
    key: 'SOCIAL',
    label: 'Social',
    icon: '🤗',
    description: 'Companionship or social support',
  },
  COORDINATION: {
    key: 'COORDINATION',
    label: 'Coordination',
    icon: '🤝',
    description: 'Help coordinating or brokering',
  },
  INFORMATION: {
    key: 'INFORMATION',
    label: 'Information',
    icon: 'ℹ️',
    description: 'Information or guidance',
  },
  LEGAL_HELP: {
    key: 'LEGAL_HELP',
    label: 'Legal Help',
    icon: '⚖️',
    description: 'Legal assistance or advice',
  },
  DOCUMENTATION: {
    key: 'DOCUMENTATION',
    label: 'Documentation',
    icon: '📄',
    description: 'Help with paperwork or documents',
  },
  MENTAL_HEALTH: {
    key: 'MENTAL_HEALTH',
    label: 'Mental Health',
    icon: '🧠',
    description: 'Mental health support',
  },
  PET_CARE: {
    key: 'PET_CARE',
    label: 'Pet Care',
    icon: '🐕',
    description: 'Pet care or pet supplies',
  },
  OTHER: {
    key: 'OTHER',
    label: 'Other',
    icon: '❓',
    description: 'Other needs or offers',
  },
};

// Array of categories for easy iteration
export const CATEGORY_LIST: CategoryInfo[] = Object.values(CATEGORIES);

// Most common categories for quick access
export const COMMON_CATEGORIES: PrimaryCategory[] = [
  'FOOD',
  'WATER',
  'SHELTER',
  'CLOTHING',
  'TRANSPORTATION',
  'COORDINATION',
];

/**
 * Get category info by key
 */
export function getCategoryInfo(key: PrimaryCategory): CategoryInfo {
  return CATEGORIES[key];
}

/**
 * Get category icon by key
 */
export function getCategoryIcon(key: PrimaryCategory): string {
  return CATEGORIES[key].icon;
}

/**
 * Get category label by key
 */
export function getCategoryLabel(key: PrimaryCategory): string {
  return CATEGORIES[key].label;
}
