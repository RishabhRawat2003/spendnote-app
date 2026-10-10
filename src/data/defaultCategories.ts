import type { Category, IconName } from '@/types';

export const MISC_CATEGORY_ID = 'misc';
export const INCOME_CATEGORY_ID = 'income';

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'food', name: 'Food', icon: 'fast-food-outline', color: '#F97316', isDefault: true },
  { id: 'groceries', name: 'Groceries', icon: 'basket-outline', color: '#22C55E', isDefault: true },
  { id: 'travel', name: 'Travel', icon: 'car-outline', color: '#0EA5E9', isDefault: true },
  { id: 'shopping', name: 'Shopping', icon: 'bag-handle-outline', color: '#EC4899', isDefault: true },
  { id: 'bills', name: 'Bills', icon: 'receipt-outline', color: '#EAB308', isDefault: true },
  { id: 'rent', name: 'Rent', icon: 'home-outline', color: '#8B5CF6', isDefault: true },
  { id: 'entertainment', name: 'Entertainment', icon: 'film-outline', color: '#F43F5E', isDefault: true },
  { id: 'health', name: 'Health', icon: 'medkit-outline', color: '#14B8A6', isDefault: true },
  { id: 'education', name: 'Education', icon: 'school-outline', color: '#6366F1', isDefault: true },
  { id: 'transfers', name: 'Transfers', icon: 'people-outline', color: '#64748B', isDefault: true },
  { id: INCOME_CATEGORY_ID, name: 'Income', icon: 'trending-up-outline', color: '#10B981', isDefault: true },
  { id: MISC_CATEGORY_ID, name: 'Misc', icon: 'ellipsis-horizontal-circle-outline', color: '#A1A1AA', isDefault: true },
];

export const CATEGORY_COLORS = [
  '#F97316', '#EF4444', '#F43F5E', '#EC4899', '#D946EF', '#A855F7',
  '#8B5CF6', '#6366F1', '#3B82F6', '#0EA5E9', '#06B6D4', '#14B8A6',
  '#10B981', '#22C55E', '#84CC16', '#EAB308', '#F59E0B', '#64748B',
];

export const CATEGORY_ICONS: IconName[] = [
  'fast-food-outline', 'cafe-outline', 'pizza-outline', 'beer-outline', 'basket-outline', 'cart-outline',
  'car-outline', 'bus-outline', 'train-outline', 'airplane-outline', 'bicycle-outline', 'bag-handle-outline',
  'shirt-outline', 'gift-outline', 'receipt-outline', 'flash-outline', 'wifi-outline', 'phone-portrait-outline',
  'home-outline', 'construct-outline', 'film-outline', 'game-controller-outline', 'musical-notes-outline', 'tv-outline',
  'medkit-outline', 'fitness-outline', 'school-outline', 'book-outline', 'people-outline', 'heart-outline',
  'paw-outline', 'trending-up-outline', 'briefcase-outline', 'card-outline', 'sparkles-outline', 'ellipsis-horizontal-circle-outline',
];
