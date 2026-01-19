
export enum AppView {
  CATALOG = 'catalog',
  CART = 'cart',
  CHECKOUT = 'checkout',
  ADMIN = 'admin',
  CALCULATOR = 'calculator',
  WISHLIST = 'wishlist',
  COMPARE = 'compare'
}

export type Category = 'Generators' | 'Inverters' | 'Batteries' | 'Solar Panels' | 'Kits';

export interface ProductDoc {
  title: string;
  url: string;
}

export interface ProductSpec {
  label: string;
  value: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  oldPrice?: number;
  category: Category;
  image: string;
  images?: string[];
  rating: number;
  reviewsCount: number;
  stock: number;
  isNew?: boolean;
  onSale?: boolean;
  features: string[];
  docs?: ProductDoc[];
  specs?: ProductSpec[];
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
