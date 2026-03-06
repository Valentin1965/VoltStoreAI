import React from 'react';
import { Product, Category } from '../types';

export const CATEGORIES: Category[] = [
  'Power Station',
  'Invertere',
  'Batterier',
  'Solpaneler',
  'Sæt',
  'Varmepumper',
  'Monteringssystemer'
];

// Global stable image for cases where the main photo is missing
export const IMAGE_FALLBACK = 'https://images.unsplash.com/photo-1508514177221-188b1cf16e9d?q=80&w=800&auto=format&fit=crop';
export const HERO_IMAGE = 'https://images.unsplash.com/photo-1542332213-31f87348057f?q=80&w=2000&auto=format&fit=crop';
export const TECH_IMAGE = 'https://images.unsplash.com/photo-1581092160562-40aa08e78837?q=80&w=800&auto=format&fit=crop';
export const ABOUT_BG = 'https://images.unsplash.com/photo-1497435334941-8c899ee9e8e9?q=80&w=1500&auto=format&fit=crop';

export const MOCK_PRODUCTS: Product[] = [
  {
    id: '1',
    name: {
      da: 'EcoFlow Delta Pro 3600Wh',
      en: 'EcoFlow Delta Pro 3600Wh Power Station',
      no: 'EcoFlow Delta Pro 3600Wh Kraftstasjon',
      se: 'EcoFlow Delta Pro 3600Wh Kraftstation'
    },
    description: {
      da: 'Bærbar kraftstation med massiv kapacitet og ultrahurtig opladningsteknologi.',
      en: 'Portable power station with massive capacity and ultra-fast charging technology.',
      no: 'Bærbar kraftstasjon med massiv kapasitet og ultra-rask ladeteknologi.',
      se: 'Bärbar kraftstation med massiv kapasitet och ultrasnabb laddningsteknik.'
    },
    price: 3599,
    old_price: 3999,
    category: 'Power Station',
    image: 'https://images.unsplash.com/photo-1620714223084-8fcacc6dfd8d?q=80&w=800&auto=format&fit=crop',
    rating: 4.9,
    reviews_count: 124,
    stock: 12,
    is_new: true,
    on_sale: true,
    is_leader: true,
    features: ['3600Wh kapacitet', 'X-Stream hurtig opladning', 'Udvidbart design'],
    is_active: true
  },
  {
    id: '2',
    name: {
      da: 'Deye SUN-5K Hybrid Inverter',
      en: 'Deye SUN-5K Hybrid Inverter',
      no: 'Deye SUN-5K Hybrid Vekselretter',
      se: 'Deye SUN-5K Hybrid Växelriktare'
    },
    description: {
      da: 'Hybrid enfaset inverter med indbygget intelligent batteristyring.',
      en: 'Hybrid single-phase inverter with built-in intelligent battery management.',
      no: 'Hybrid enfaset vekselretter med innebygd intelligent batteristyring.',
      se: 'Hybrid enfas växelriktare med inbyggd intelligent batterihantering.'
    },
    price: 1250,
    category: 'Invertere',
    image: TECH_IMAGE,
    rating: 4.7,
    reviews_count: 56,
    stock: 8,
    is_leader: true,
    features: ['5 kW udgangseffekt', 'Dual MPPT', 'Smart køling'],
    is_active: true
  }
];