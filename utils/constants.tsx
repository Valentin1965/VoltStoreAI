
import React from 'react';
import { Product, Category } from '../types';

export const CATEGORIES: Category[] = [
  'Charging Stations',
  'Inverters',
  'Batteries',
  'Solar Panels',
  'Kits',
  'Heat Pumps',
  'Mounting Systems'
];

export const MOCK_PRODUCTS: Product[] = [
  {
    id: '1',
    name: 'EcoFlow Delta Pro 3600Wh',
    description: 'Portable power station with massive capacity and ultra-fast charging technology. Ideal for home backup power.',
    price: 125000,
    old_price: 140000,
    category: 'Charging Stations',
    image: 'https://images.unsplash.com/photo-1620714223084-8fcacc6dfd8d?q=80&w=800&auto=format&fit=crop',
    rating: 4.9,
    reviews_count: 124,
    stock: 12,
    is_new: true,
    on_sale: true,
    is_leader: true,
    features: ['3600Wh Capacity', 'X-Stream Fast Charging', 'Expandable design']
  },
  {
    id: '2',
    name: 'Deye SUN-5K-SG03LP1-EU',
    description: 'Hybrid single-phase inverter with built-in intelligent battery management and grid-tie support.',
    price: 45000,
    category: 'Inverters',
    image: 'https://images.unsplash.com/photo-1592833159155-c62df1b35624?q=80&w=800&auto=format&fit=crop',
    rating: 4.7,
    reviews_count: 56,
    stock: 8,
    is_leader: true,
    features: ['5 kW Power Output', 'Dual MPPT', 'Smart Cooling']
  },
  {
    id: '3',
    name: 'Pylontech US5000 4.8kWh',
    description: 'Latest model of Pylontech batteries. 4.8kWh capacity, high cycle life, and compatibility with most inverters.',
    price: 68000,
    category: 'Batteries',
    image: 'https://images.unsplash.com/photo-1611333162130-04193c27d862?q=80&w=800&auto=format&fit=crop',
    rating: 5.0,
    reviews_count: 89,
    stock: 15,
    is_leader: true,
    features: ['95% DoD', '6000+ Cycles', 'Modular design']
  },
  {
    id: '4',
    name: 'Longi Solar 450W Mono',
    description: 'High efficiency monocrystalline solar panel for home and industrial installations.',
    price: 4200,
    category: 'Solar Panels',
    image: 'https://images.unsplash.com/photo-1508514177221-188b1cf16e9d?q=80&w=800&auto=format&fit=crop',
    rating: 4.8,
    reviews_count: 210,
    stock: 100,
    is_leader: true,
    features: ['20.9% Efficiency', 'Half-cut technology', '12 years warranty']
  }
];
