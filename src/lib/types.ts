import type { Timestamp } from 'firebase/firestore';

export type UserRole = 'admin' | 'lawyer' | 'financial';

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

export type Transaction = {
  id: string;
  description: string;
  amount: number;
  type: 'receita' | 'despesa';
  date: string;
  clientName: string;
};
