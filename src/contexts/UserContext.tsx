import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { UserProfile } from '../types';
import { safeStorage } from '../utils/storage';

interface UserContextType {
  users: UserProfile[];
  currentUser: UserProfile | null;
  registerUser: (userData: Omit<UserProfile, 'id' | 'cards'>) => UserProfile;
  findUser: (emailQuery: string) => UserProfile | undefined;
  login: (user: UserProfile) => void;
  logout: () => void;
  updateUserDiscount: (userId: string, discount: number) => void;
  getDiscountedPrice: (basePrice: number) => number;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

const INITIAL_USERS: UserProfile[] = [
  {
    id: 'usr_1',
    name: 'Anders Jensen',
    email: 'anders@greenlight.dk',
    phone: '+45 31 18 58 19',
    address: 'Øster Teglgårdsvej 6, 8800 Viborg, Danmark',
    city: 'Viborg',
    cards: [
      { id: 'c1', brand: 'visa', last4: '4242', exp_month: 12, exp_year: 2025 }, 
      { id: 'c2', brand: 'mastercard', last4: '8899', exp_month: 6, exp_year: 2026 }
    ],
    discount: 0
  }
];

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<UserProfile[]>(INITIAL_USERS);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const isInitialized = useRef(false);

  useEffect(() => {
    if (isInitialized.current) return;
    const savedUsers = safeStorage.getItem('voltstoreai_users_v2');
    const savedUser = safeStorage.getItem('voltstoreai_current_user_v2');
    if (savedUsers) {
      try {
        setUsers(JSON.parse(savedUsers));
      } catch (e) {}
    }
    if (savedUser) {
      try {
        setCurrentUser(JSON.parse(savedUser));
      } catch (e) {}
    }
    isInitialized.current = true;
  }, []);

  useEffect(() => {
    if (!isInitialized.current) return;
    safeStorage.setItem('voltstoreai_users_v2', JSON.stringify(users));
    safeStorage.setItem('voltstoreai_current_user_v2', JSON.stringify(currentUser));
  }, [users, currentUser]);

  const registerUser = (userData: Omit<UserProfile, 'id' | 'cards'>) => {
    const newUser: UserProfile = {
      ...userData,
      id: `usr_${Date.now()}`,
      cards: [{ id: `c_${Date.now()}`, brand: 'visa', last4: '1234', exp_month: 1, exp_year: 2027 }],
      discount: 0
    };
    setUsers(prev => [...prev, newUser]);
    return newUser;
  };

  const findUser = (emailQuery: string) => {
    const q = emailQuery.toLowerCase().trim();
    return users.find(u => u.email.toLowerCase() === q);
  };

  const login = (user: UserProfile) => setCurrentUser(user);
  const logout = () => setCurrentUser(null);

  const updateUserDiscount = (userId: string, discount: number) => {
    const updatedUsers = users.map(u => u.id === userId ? { ...u, discount: Math.min(100, Math.max(0, discount)) } : u);
    setUsers(updatedUsers);
    if (currentUser?.id === userId) {
      setCurrentUser(prev => prev ? { ...prev, discount: Math.min(100, Math.max(0, discount)) } : null);
    }
  };

  const getDiscountedPrice = useCallback((basePrice: number) => {
    if (!currentUser || !currentUser.discount || currentUser.discount <= 0) {
      return basePrice;
    }
    const discountAmount = (basePrice * currentUser.discount) / 100;
    return basePrice - discountAmount;
  }, [currentUser]);

  return (
    <UserContext.Provider value={{ 
      users, currentUser, registerUser, findUser, login, logout, 
      updateUserDiscount, getDiscountedPrice 
    }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) throw new Error('useUser must be used within UserProvider');
  return context;
};