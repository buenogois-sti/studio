import type { Timestamp } from 'firebase/firestore';

export type UserRole = 'admin' | 'lawyer' | 'financial';

export type UserProfile = {
  id: string;
  googleId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

export type Client = {
  id: string;
  name: string;
  avatar: string;
  document: string;
  email: string;
  phone?: string;
  createdAt: Timestamp | string;
};

export type Process = {
  id: string;
  number: string;
  clientName: string;
  status: 'active' | 'archived' | 'suspended';
  lastUpdate: string;
};

export type Hearing = {
  id: string;
  processNumber: string;
  date: string;
  time: string;
  location: string;
  responsible: string;
};

export type FinancialTransaction = {
  id: string;
  clientId: string;
  description: string;
  amount: number;
  type: 'receita' | 'despesa';
  transactionDate: Timestamp;
};
