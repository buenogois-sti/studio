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
  motherName?: string;
  rg?: string;
  ctps?: string;
  pis?: string;
  phone?: string;
  mobile?: string;
  emergencyContact?: string;
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
   bankInfo?: {
    bankName?: string;
    agency?: string;
    account?: string;
    pixKey?: string;
  };
  driveFolderId?: string;
  sheetId?: string;
  createdAt: Timestamp | string;
  updatedAt?: Timestamp | string;
};

export type Process = {
  id: string;
  clientId: string;
  name: string;
  processNumber?: string;
  court?: string;
  courtBranch?: string;
  caseValue?: number;
  opposingParties?: string[];
  description?: string;
  status: 'Ativo' | 'Arquivado' | 'Pendente';
  responsibleStaffIds?: string[];
  driveFolderId?: string;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
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
  description: string;
  amount: number;
  type: 'receita' | 'despesa';
  transactionDate: Timestamp;
  category: string;
  status: 'pago' | 'pendente' | 'vencido';
  dueDate?: Timestamp;
  clientId?: string;
  staffId?: string;
};


export type Log = {
    id: string;
    userId: string;
    action: string;
    description: string;
    timestamp: Timestamp;
};

export type StaffRole = 'employee' | 'lawyer' | 'intern';
export type OABStatus = 'Ativa' | 'Suspensa' | 'Inativa' | 'Pendente';

export type Staff = {
  id: string;
  role: StaffRole;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  whatsapp?: string;
  address?: {
    street?: string;
    number?: string;
    complement?: string;
    zipCode?: string;
    neighborhood?: string;
    city?: string;
    state?: string;
  };
  oabNumber?: string;
  oabStatus?: OABStatus;
  bankInfo?: {
    bankName?: string;
    agency?: string;
    account?: string;
    pixKey?: string;
  };
  createdAt: Timestamp;
  updatedAt?: Timestamp;
};

export type ClientKitTemplate = {
  id: string;
  name: string;
  templateId: string;
  destination: string;
};
