import { supabase } from './supabase';

export interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

export interface OrderData {
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  city: string;
  department: string;
  total_price: number;
  items: OrderItem[];
  payment_method: string;
  status?: 'pending' | 'paid' | 'shipped' | 'cancelled';
}

export const orderService = {
  // Створення нового замовлення
  async createOrder(order: OrderData) {
    const { data, error } = await supabase
      .from('orders')
      .insert([order])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Отримання історії замовлень за email
  async getOrdersByEmail(email: string) {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('customer_email', email)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }
};