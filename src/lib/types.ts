'use client';
import type { Timestamp } from 'firebase/firestore';

export type UserRole = 'admin' | 'lawyer' | 'financial' | 'assistant';

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

export type UserRoleInfo = {
  email: string;
  role: UserRole;
};

export type ClientStatus = 'lead' | 'active' | 'inactive';

export type Client = {
  id: string;
  firstName: string;
  lastName: string;
  clientType?: string;
  avatar: string;
  document: string;
  email: string;
  status?: ClientStatus;
  motherName?: string;
  rg?: string;
  ctps?: string;
  pis?: string;
  stateRegistration?: string;
  municipalRegistration?: string;
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
    bankBeneficiary?: string;
  };
  driveFolderId?: string;
  sheetId?: string;
  createdAt: Timestamp | string;
  updatedAt?: Timestamp | string;
};

export type TimelineEvent = {
  id: string;
  type: 'note' | 'decision' | 'petition' | 'hearing' | 'system' | 'deadline';
  description: string;
  date: Timestamp;
  authorName: string;
  endDate?: Timestamp;
  isBusinessDays?: boolean;
};

export type OpposingParty = {
  name: string;
  email?: string;
  phone?: string;
};

export type TeamParticipant = {
  staffId: string;
  percentage: number;
};

export type LeadStatus = 'NOVO' | 'EM_ELABORACAO' | 'PRONTO' | 'CONVERTIDO' | 'REPROVADO';
export type LeadPriority = 'BAIXA' | 'MEDIA' | 'ALTA' | 'CRITICA';

export type Lead = {
  id: string;
  clientId: string;
  clientName?: string;
  lawyerId: string;
  title: string;
  legalArea: string;
  status: LeadStatus;
  priority: LeadPriority;
  captureSource: string;
  isUrgent: boolean;
  prescriptionDate?: Timestamp;
  description?: string;
  driveFolderId?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

export type Process = {
  id: string;
  clientId: string;
  clientName?: string;
  clientRole?: 'Polo Ativo' | 'Polo Passivo';
  secondaryClientIds?: string[];
  name: string;
  processNumber?: string;
  court?: string;
  courtAddress?: string;
  courtBranch?: string;
  courtWebsite?: string;
  caseValue?: number;
  opposingParties?: OpposingParty[];
  description?: string;
  status: 'Ativo' | 'Arquivado' | 'Pendente';
  legalArea: string;
  responsibleStaffIds?: string[];
  teamParticipants?: TeamParticipant[];
  leadLawyerId?: string;
  defaultLocation?: string;
  driveFolderId?: string;
  globalDriveFolderId?: string;
  timeline?: TimelineEvent[];
  createdAt: Timestamp;
  updatedAt?: Timestamp;
};

export type HearingStatus = 'PENDENTE' | 'REALIZADA' | 'CANCELADA' | 'ADIADA';
export type HearingType = 'CONCILIACAO' | 'INSTRUCAO' | 'UNA' | 'JULGAMENTO' | 'OUTRA';

export type Hearing = {
  id: string;
  processId: string;
  lawyerId: string;
  lawyerName?: string;
  createdById: string;
  createdByName: string;
  date: Timestamp;
  location: string;
  courtBranch?: string;
  responsibleParty: string;
  status: HearingStatus;
  type: HearingType;
  notes?: string;
  resultNotes?: string;
  hasFollowUp?: boolean;
  googleCalendarEventId?: string;
  createdAt?: Timestamp;
};

export type LegalDeadlineStatus = 'PENDENTE' | 'CUMPRIDO' | 'PERDIDO' | 'CANCELADO';

export type LegalDeadline = {
  id: string;
  processId: string;
  type: string;
  startDate: Timestamp;
  endDate: Timestamp;
  publicationText?: string;
  observations?: string;
  status: LegalDeadlineStatus;
  daysCount: number;
  isBusinessDays: boolean;
  authorId: string;
  authorName: string;
  googleCalendarEventId?: string;
  googleTaskId?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

export type FinancialEvent = {
  id: string;
  processId: string;
  type: 'ACORDO' | 'SENTENCA' | 'EXECUCAO' | 'CONTRATO' | 'CUSTAS' | 'PERICIA' | 'DESLOCAMENTO' | 'ADICIONAL';
  eventDate: Date | Timestamp;
  description: string;
  totalValue: number;
};

export type FinancialTitle = {
  id: string;
  financialEventId?: string;
  processId?: string;
  clientId?: string;
  costCenter?: string;
  description: string;
  type: 'RECEITA' | 'DESPESA';
  origin:
    | 'ACORDO'
    | 'SENTENCA'
    | 'HONORARIOS_CONTRATUAIS'
    | 'SUCUMBENCIA'
    | 'CUSTAS_PROCESSUAIS'
    | 'HONORARIOS_PAGOS'
    | 'SALARIOS_PROLABORE'
    | 'ALUGUEL_CONTAS'
    | 'INFRAESTRUTURA_TI'
    | 'MARKETING_PUBLICIDADE'
    | 'IMPOSTOS_TAXAS'
    | 'MATERIAL_ESCRITORIO'
    | 'SERVICOS_TERCEIROS'
    | 'OUTRAS_DESPESAS'
    | 'PERICIA'
    | 'DESLOCAMENTO'
    | 'ADICIONAL';
  value: number;
  dueDate: Date | Timestamp;
  paymentDate?: Timestamp;
  status: 'PENDENTE' | 'PAGO' | 'ATRASADO';
  paidToStaffId?: string;
};

export type ReimbursementStatus = 'SOLICITADO' | 'APROVADO' | 'REEMBOLSADO' | 'NEGADO';

export type Reimbursement = {
  id: string;
  userId: string;
  userName: string;
  description: string;
  value: number;
  requestDate: Timestamp;
  status: ReimbursementStatus;
  processId?: string;
  processName?: string;
  notes?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

export type Log = {
    id: string;
    userId: string;
    action: string;
    description: string;
    timestamp: Timestamp;
};

export type StaffRole = 'employee' | 'lawyer' | 'intern' | 'provider' | 'partner';
export type OABStatus = 'Ativa' | 'Suspensa' | 'Inativa' | 'Pendente';
export type RemunerationType = 'SUCUMBENCIA' | 'PRODUCAO' | 'QUOTA_LITIS' | 'FIXO_MENSAL' | 'AUDIENCISTA';

export type StaffCreditStatus = 'RETIDO' | 'DISPONIVEL' | 'PAGO';
export type StaffCreditType = 'HONORARIOS' | 'REEMBOLSO' | 'SALARIO' | 'PRODUCAO' | 'BONUS' | 'DEBITO';

export type StaffCredit = {
  id: string;
  type: StaffCreditType;
  description: string;
  value: number;
  status: StaffCreditStatus;
  date: Timestamp;
  processId?: string;
  financialEventId?: string;
  reimbursementId?: string;
  paymentDate?: Timestamp;
  paidBy?: string;
  authorName?: string;
  monthKey?: string;
};

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
    bankBeneficiary?: string;
  };
  remuneration?: {
    type: RemunerationType;
    officePercentage?: number;
    lawyerPercentage?: number;
    fixedMonthlyValue?: number;
    valuePerHearing?: number;
    activityPrices?: {
      drafting?: number;
      diligence?: number;
      other?: number;
    };
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

export type NotificationType = 'info' | 'success' | 'warning' | 'error' | 'finance' | 'deadline' | 'hearing';

export type Notification = {
  id: string;
  userId: string;
  title: string;
  description: string;
  href?: string;
  isRead: boolean;
  type?: NotificationType;
  createdAt: Timestamp;
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
