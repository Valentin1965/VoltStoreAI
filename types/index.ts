
export enum AppView {
  CATALOG = 'catalog',
  CART = 'cart',
  CHECKOUT = 'checkout',
  ADMIN = 'admin',
  CALCULATOR = 'calculator',
  WISHLIST = 'wishlist',
  COMPARE = 'compare'
}

export type Category = 'Charging Stations' | 'Inverters' | 'Batteries' | 'Solar Panels' | 'Kits';

export interface ProductDoc {
  title: string;
  url: string;
}

export interface ProductSpec {
  label: string;
  value: string;
}

export interface Alternative {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

export interface KitComponent {
  id: string;
  name: string;
  price: number;
  quantity: number;
  alternatives: Alternative[];
}

export interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  old_price?: number | null;
  category: Category;
  sub_category?: string | null;
  image: string | null;
  images?: string[] | null;
  rating?: number | null;
  reviews_count?: number | null;
  stock?: number | null;
  is_new?: boolean | null;
  on_sale?: boolean | null;
  features?: string[] | null;
  specs?: string | null; 
  detailed_tech_specs?: string | null;
  docs?: string | null;
  kitComponents?: KitComponent[]; 
  created_at?: string;
}

export interface KitPart {
  id: string;
  name: string;
  price: number;
  quantity: number;
  minQuantity?: number;
  maxQuantity?: number;
}

export interface CartItem extends Product {
  quantity: number;
  parts?: KitPart[];
}

export interface Order {
  id: string;
  items: CartItem[];
  total: number;
  status: 'pending' | 'shipped' | 'delivered' | 'cancelled';
  date: string;
  customer: {
    name: string;
    email: string;
    phone: string;
    city: string;
    department: string;
  };
}
