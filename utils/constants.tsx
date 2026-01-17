
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
    description: 'Портативна зарядна станція з величезною ємністю та технологією надшвидкої зарядки. Ідеально для резервного живлення будинку.',
    price: 125000,
    oldPrice: 140000,
    category: 'Batteries',
    image: 'https://images.unsplash.com/photo-1620714223084-8fcacc6dfd8d?q=80&w=800&auto=format&fit=crop',
    rating: 4.9,
    reviewsCount: 124,
    stock: 12,
    isNew: true,
    onSale: true,
    features: ['Ємність 3600 Вт·год', 'Швидка зарядка X-Stream', 'Можливість розширення']
  },
  {
    id: '2',
    name: 'Deye SUN-5K-SG03LP1-EU',
    description: 'Гібридний однофазний інвертор з вбудованим інтелектуальним керуванням батареями та підтримкою зеленого тарифу.',
    price: 45000,
    category: 'Inverters',
    image: 'https://images.unsplash.com/photo-1592833159155-c62df1b35624?q=80&w=800&auto=format&fit=crop',
    rating: 4.7,
    reviewsCount: 56,
    stock: 8,
    features: ['Потужність 5 кВт', 'Подвійний MPPT', 'Розумне охолодження']
  },
  {
    id: '3',
    name: 'Jinko Solar 550W Tiger Pro',
    description: 'Монокристалічна сонячна панель з високим ККД для приватних та комерційних сонячних електростанцій.',
    price: 8500,
    oldPrice: 9500,
    category: 'Solar Panels',
    image: 'https://images.unsplash.com/photo-1508514177221-188b1cf16e9d?q=80&w=800&auto=format&fit=crop',
    rating: 4.8,
    reviewsCount: 89,
    stock: 45,
    onSale: true,
    features: ['Потужність 550 Вт', 'Технологія MBB', 'Захист Anti-PID']
  },
  {
    id: '4',
    name: 'Pylontech US5000 4.8kWh',
    description: 'Літій-залізо-фосфатний (LiFePO4) акумуляторний модуль для систем накопичення енергії.',
    price: 68000,
    category: 'Batteries',
    image: 'https://images.unsplash.com/photo-1617788138017-80ad40651399?q=80&w=800&auto=format&fit=crop',
    rating: 4.9,
    reviewsCount: 34,
    stock: 15,
    features: ['Модуль 4.8 кВт·год', '6000+ циклів', 'Масштабована конструкція']
  },
  {
    id: '5',
    name: 'Solar Backup Kit 3kW',
    description: 'Готовий комплект для енергонезалежності: інвертор та 2 потужних акумулятори з монтажним комплектом.',
    price: 185000,
    category: 'Kits',
    image: 'https://images.unsplash.com/photo-1497435334941-8c899ee9e8e9?q=80&w=800&auto=format&fit=crop',
    rating: 5.0,
    reviewsCount: 12,
    stock: 5,
    isNew: true,
    features: ['Інвертор 3 кВт', 'Запас енергії 9.6 кВт·год', 'Повний монтажний набір']
  }
];
