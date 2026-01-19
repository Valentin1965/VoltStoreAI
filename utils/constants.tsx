
import React from 'react';
import { Product, Category } from '../types';

export const CATEGORIES: Category[] = [
  'Generators',
  'Inverters',
  'Batteries',
  'Solar Panels',
  'Kits'
];

export const MOCK_PRODUCTS: Product[] = [
  {
    id: '1',
    name: 'EcoFlow Delta Pro 3600Wh',
    description: 'Portable power station with massive capacity and ultra-fast charging technology. Ideal for home backup power.',
    price: 125000,
    oldPrice: 140000,
    category: 'Batteries',
    image: 'https://images.unsplash.com/photo-1620714223084-8fcacc6dfd8d?q=80&w=800&auto=format&fit=crop',
    rating: 4.9,
    reviewsCount: 124,
    stock: 12,
    isNew: true,
    onSale: true,
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
    reviewsCount: 56,
    stock: 8,
    features: ['5 kW Power Output', 'Dual MPPT', 'Smart Cooling']
  },
  {
    id: '3',
    name: 'Jinko Solar 550W Tiger Pro',
    description: 'Monocrystalline solar panel with high efficiency for residential and commercial solar power plants.',
    price: 8500,
    oldPrice: 9500,
    category: 'Solar Panels',
    image: 'https://images.unsplash.com/photo-1508514177221-188b1cf16e9d?q=80&w=800&auto=format&fit=crop',
    rating: 4.8,
    reviewsCount: 89,
    stock: 45,
    onSale: true,
    features: ['550W Power', 'MBB Technology', 'Anti-PID Protection']
  },
  {
    id: '4',
    name: 'Pylontech US5000 4.8kWh',
    description: 'Lithium iron phosphate (LiFePO4) battery module for energy storage systems.',
    price: 68000,
    category: 'Batteries',
    image: 'https://images.unsplash.com/photo-1617788138017-80ad40651399?q=80&w=800&auto=format&fit=crop',
    rating: 4.9,
    reviewsCount: 34,
    stock: 15,
    features: ['4.8 kWh Module', '6000+ Cycles', 'Scalable Architecture']
  },
  {
    id: '5',
    name: 'Solar Backup Kit 3kW',
    description: 'Ready-to-use kit for energy independence: inverter and 2 powerful batteries with mounting kit.',
    price: 185000,
    category: 'Kits',
    image: 'https://images.unsplash.com/photo-1497435334941-8c899ee9e8e9?q=80&w=800&auto=format&fit=crop',
    rating: 5.0,
    reviewsCount: 12,
    stock: 5,
    isNew: true,
    features: ['3 kW Inverter', '9.6 kWh Energy Storage', 'Full Installation Kit']
  }
];
