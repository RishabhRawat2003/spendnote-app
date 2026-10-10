import type { Source, SourceInfo } from '@/types';

export const SOURCES: Record<Source, SourceInfo> = {
  gpay: { id: 'gpay', label: 'Google Pay', icon: 'logo-google', color: '#4285F4' },
  phonepe: { id: 'phonepe', label: 'PhonePe', icon: 'phone-portrait-outline', color: '#5F259F' },
  paytm: { id: 'paytm', label: 'Paytm', icon: 'wallet-outline', color: '#00BAF2' },
  bhim: { id: 'bhim', label: 'BHIM UPI', icon: 'swap-horizontal-outline', color: '#F37021' },
  slice_card: { id: 'slice_card', label: 'slice Card', icon: 'card-outline', color: '#7C3AED' },
  slice_account: { id: 'slice_account', label: 'slice Account', icon: 'albums-outline', color: '#A855F7' },
  canara: { id: 'canara', label: 'Canara Bank', icon: 'business-outline', color: '#0284C7' },
  cash: { id: 'cash', label: 'Cash', icon: 'cash-outline', color: '#16A34A' },
};

export const SOURCE_LIST: SourceInfo[] = Object.values(SOURCES);
