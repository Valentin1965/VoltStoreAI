export enum AppView {
  CATALOG = 'catalog',
  CART = 'cart',
  CHECKOUT = 'checkout',
  ADMIN = 'admin',
  CALCULATOR = 'calculator',
  WISHLIST = 'wishlist',
  COMPARE = 'compare',
  ABOUT = 'about',
  CABINET = 'cabinet',
  SUCCESS = 'success' 
}

// ... (Category, ProductDoc, ProductSpec, Alternative, KitComponent залишаються без змін)

export interface Order {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  city: string;
  department: string;
  total_price: number;
  items: any[]; // Змінено на any[] або CartItem[], оскільки JSONB з бази приходить як масив об'єктів
  payment_method: string;
  // Додано статуси, які реально надсилає Mollie
  status: 'pending' | 'paid' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'expired' | 'failed' | 'refunded'; 
  currency?: string;     
  mollie_id?: string;    
  user_id?: string;      
  created_at: string;
}

// Додамо інтерфейс для картки користувача, якщо ви плануєте їх відображати в кабінеті або адмінці
export interface UserCard {
  id: string;
  brand: string;
  last4: string;
  exp_month: number;
  exp_year: number;
}

// Розширений інтерфейс користувача для адмін-панелі та кабінету
export interface UserProfile {
  id: string;
  email: string;
  name?: string;
  phone?: string;
  city?: string;
  address?: string;
  cards?: UserCard[];
  created_at?: string;
}