
export enum AppView {
  CATALOG = 'catalog',
  CART = 'cart',
  CHECKOUT = 'checkout',
  ADMIN = 'admin',
  CALCULATOR = 'calculator',
  SERVICE = 'service',
  ABOUT = 'about',
  CABINET = 'cabinet',
  SUCCESS = 'success' 
}

// NOTE: Category values come from DB/localization and have drift over time.
// Keep this union permissive enough to match runtime values.
export type Category =
  | 'Invertere'
  | 'Batterier'
  | 'Solpaneler'
  | 'Sæt'
  | 'Kits'
  | 'Varmepumper'
  | 'Monteringssystemer'
  | 'Power Station';

export type LocalizedText = string | { [key: string]: string };

export interface ProductSpec {
  label: string;
  value: string;
}

export interface ProductDoc {
  title: string;
  url: string;
}

export interface KitComponent {
  id: string;
  name: string;
  price: number;
  quantity: number;
  alternatives?: any[];
  // Legacy / DB fields (optional to avoid breaking existing runtime data)
  isBase?: boolean;
  is_base?: boolean;
  typeComplect?: string;
  type_complect?: string;
  market?: boolean;
}

export interface KitPart {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

export interface Product {
  id: string;
  name: LocalizedText;
  description?: LocalizedText;
  price: number;
  old_price?: number;
  category: Category;
  subcategory?: string;
  manufacturer?: string;
  inverter_type?: string;
  image: string;
  images?: string[];
  video_url?: string;
  rating?: number;
  reviews_count?: number;
  stock: number;
  is_new?: boolean;
  on_sale?: boolean;
  is_leader?: boolean;
  is_active?: boolean;
  features: string[];
  specs?: ProductSpec[] | string;
  docs?: ProductDoc[] | string;
  kitComponents?: KitComponent[];
  base_price?: number;  // Kit: manually set base price (EUR excl. VAT), overrides total_price display if > 0
  
  // New specific fields from user tables
  BrandProd?: string;
  ModelName?: string;
  SkuShopId?: string;
  PriceEurExVat?: number;
  StockLvl?: number;
  
  // Battery specific
  BattType?: string;
  BattChem?: string;
  CapKwh?: number;
  NomVoltV?: number;
  CycleLife?: string;
  MaxChgDchgCur_A?: string;
  Scalab?: string;
  OpTempC?: string;
  BmsInt?: string;
  BattCert?: string;
  DimsMm?: string;
  WgtKg?: number;

  // EV Charger / Power Station specific
  ChgPwrKw?: number;
  ConnType?: string;
  AuthMeth?: string;
  OcppVer?: string;
  DynLoadMng?: string;
  V2gSupp?: string;
  ChgProtRcd?: string;
  MidMet?: string;

  // Heat Pump specific
  HpType?: string;
  Phases1?: string;
  RefrType?: string;
  HeatCapKw?: number;
  Scop35C?: number;
  MaxFlowTempC?: number;
  SndPwrDba?: string;

  // Inverter specific
  InvType?: string;
  Phases?: string;
  MaxEffPerc?: number;
  NumMppts?: number;
  MpptVoltRangeV?: string;
  MaxPvInVoltV?: number;
  CommProt?: string;
  IntProt?: string;
  IpRating?: string;

  // Solar Panel specific
  SolarPanelType?: string;
  CellTech?: string;
  RatedPwrWp?: number;
  ModEffPerc?: number;
  TempCoeffPmax?: number;
  GlassType?: string;
  ProdWarrYrs?: number;
  PerfWarrYrs?: number;
}

export interface CartItem extends Product {
  quantity: number;
  parts?: KitPart[];
}

export interface Order {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  city: string;
  department: string;
  total_price: number;
  items: any[]; 
  payment_method: string;
  status: 'pending' | 'paid' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'expired' | 'failed' | 'refunded'; 
  customer_message?: string;
  currency?: string;     
  mollie_id?: string;    
  user_id?: string;      
  created_at: string;

  // Admin dashboard / legacy DB columns
  order_status?: string;
  client_email?: string;
  client_name?: string;
}

export interface UserCard {
  id: string;
  brand: string;
  last4: string;
  exp_month: number;
  exp_year: number;
}

export interface UserProfile {
  id: string;
  email: string;
  // display helpers (computed from first_name + last_name)
  name?: string;
  // clients table fields
  first_name?: string;
  last_name?: string;
  phone?: string;
  client_type?: 'private' | 'business';
  company_name?: string;
  vat_number?: string;
  // billing address
  city?: string;
  country?: string;
  street?: string;
  house_number?: string;
  apartment?: string;
  postal_code?: string;
  // delivery address
  delivery_same_as_billing?: boolean;
  delivery_country?: string;
  delivery_city?: string;
  delivery_street?: string;
  delivery_house_number?: string;
  delivery_apartment?: string;
  delivery_postal_code?: string;
  delivery_phone?: string;
  // legacy compat
  address?: string;
  cards?: UserCard[];
  created_at?: string;
  discount?: number;
}