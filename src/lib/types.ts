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
  googleRefreshToken?: string;
};

export type Client = {
  id: string;
  firstName: string;
  lastName: string;
  clientType?: string;
  avatar: string;
  document: string;
  email: string;
  phone?: string;
  mobile?: string;
  legalArea?: string;
  address?: {
    street?: string;
    number?: string;
    complement?: string;
    zipCode?: string;
    neighborhood?: string;
    city?: string;
    state?: string;
  };
  driveFolderId?: string;
  sheetId?: string;
  createdAt: Timestamp | string;
  updatedAt?: Timestamp;
};

export type Process = {
  id: string;
  clientId: string;
  name: string;
  driveFolderId: string;
  description: string;
  createdAt: Timestamp;
};

export type Hearing = {
  id: string;
  processId: string;
  date: Timestamp;
  location: string;
  responsibleParty: string;
  notes?: string;
};

export type FinancialTransaction = {
  id: string;
  clientId: string;
  description: string;
  amount: number;
  type: 'receita' | 'despesa';
  transactionDate: Timestamp;
};

export type Log = {
    id: string;
    userId: string;
    action: string;
    description: string;
    timestamp: Timestamp;
};
