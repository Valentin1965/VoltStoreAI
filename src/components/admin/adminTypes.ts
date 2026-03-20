// Shared constants and types for Admin panel modules

export const categoryToTable: Record<string, string> = {
  'Batterier': 'batteries',
  'Invertere': 'inverters',
  'Solpaneler': 'solar_panels',
  'Power Station': 'ev_chargers',
  'Varmepumper': 'heat_pumps',
  'Sæt': 'kits',
};

export const IMAGE_FALLBACK =
  'https://images.unsplash.com/photo-1581092160562-40aa08e78837?q=80&w=400&auto=format&fit=crop';

export const emptyLoc = () => ({ da: '', en: '', no: '', se: '' });

export const ORDER_STATUSES = [
  { key: 'accepted',           label: 'Modtaget',           color: 'bg-blue-50 border-blue-200 text-blue-700',       dot: 'bg-blue-500' },
  { key: 'in_progress',        label: 'I arbejde',          color: 'bg-amber-50 border-amber-200 text-amber-700',    dot: 'bg-amber-500' },
  { key: 'awaiting_transport', label: 'Afventer transport', color: 'bg-purple-50 border-purple-200 text-purple-700', dot: 'bg-purple-500' },
  { key: 'in_transit',         label: 'I transit',          color: 'bg-emerald-50 border-emerald-200 text-emerald-700', dot: 'bg-emerald-500' },
  { key: 'cancelled',          label: 'Annulleret',         color: 'bg-rose-50 border-rose-200 text-rose-700',        dot: 'bg-rose-500' },
] as const;

export type AdminTab = 'dashboard' | 'orders' | 'kits' | 'products' | 'clients' | 'bookings' | 'calculator';
export type ModalTab = 'main' | 'media' | 'specs' | 'kit_builder';

export interface OrderStatusEdit {
  status: string;
  shipping_date: string;
  arrival_date: string;
}
