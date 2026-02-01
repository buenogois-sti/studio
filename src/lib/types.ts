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

export type FinancialEvent = {
  id: string;
  processId: string;
  type: 'ACORDO' | 'SENTENCA' | 'EXECUCAO' | 'CONTRATO';
  eventDate: Timestamp;
  description: string;
  totalValue: number;
};

export type FinancialTitle = {
  id: string;
  financialEventId?: string;
  processId?: string;
  clientId?: string;
  description: string;
  type: 'RECEITA' | 'DESPESA';
  origin:
    | 'ACORDO'
    | 'SENTENCA'
    | 'HONORARIOS_CONTRATUAIS'
    | 'SUCUMBENCIA'
    | 'CUSTAS_PROCESSUAIS'
    | 'DESPESA_OPERACIONAL';
  value: number;
  dueDate: Timestamp;
  paymentDate?: Timestamp;
  status: 'PENDENTE' | 'PAGO' | 'ATRASADO';
};

export type FeeSplitRule = {
  processId: string;
  participants: {
    staffId: string;
    percentage: number;
  }[];
};

export type LawyerCredit = {
  id: string;
  staffId: string;
  processId: string;
  financialTitleId: string;
  value: number;
  creditDate: Timestamp;
  status: 'DISPONIVEL' | 'RETIDO' | 'PAGO';
  payoutDate?: Timestamp;
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

export type DocumentTemplate = {
  id: string;
  name: string;
  description: string;
  category: string;
  templateFileId: string;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
};

    