
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
  staffId?: string;
  googleRefreshToken?: string;
  googleSyncEnabled?: boolean;
  googleScopes?: string[];
  lgpdAccepted?: boolean;
  lgpdAcceptedAt?: Timestamp;
};

export type UserRoleInfo = {
  email: string;
  role: UserRole;
};

export type PermissionKey = 
  | 'view_finance' 
  | 'manage_users' 
  | 'view_reports' 
  | 'view_all_processes' 
  | 'edit_settings'
  | 'manage_leads'
  | 'manage_staff';

export type RolePermissions = Record<UserRole, Record<PermissionKey, boolean>>;

export type ClientStatus = 'lead' | 'active' | 'inactive';

export type Client = {
  id: string;
  firstName: string;
  lastName: string;
  clientType?: string;
  avatar: string;
  document: string;
  email?: string;
  status?: ClientStatus;
  motherName?: string;
  rg?: string;
  rgIssuer?: string;
  rgIssuanceDate?: string;
  ctps?: string;
  pis?: string;
  nationality?: string;
  civilStatus?: string;
  profession?: string;
  stateRegistration?: string;
  municipalRegistration?: string;
  representativeName?: string;
  representativeCpf?: string;
  representativeRg?: string;
  representativeRole?: string;
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
  type: 'note' | 'decision' | 'petition' | 'hearing' | 'system' | 'deadline' | 'pericia' | 'meeting' | 'diligence';
  description: string;
  date: Timestamp;
  authorName: string;
  endDate?: Timestamp;
  isBusinessDays?: boolean;
};

export type OpposingParty = {
  name: string;
  document?: string;
  email?: string;
  phone?: string;
  address?: string;
  cep?: string;
  observation?: string;
};

export type TeamParticipant = {
  staffId: string;
  percentage: number;
};

// LeadStatus atualizado Bueno Gois
export type LeadStatus = 'NOVO' | 'ATENDIMENTO' | 'CONTRATUAL' | 'BUROCRACIA' | 'DISTRIBUICAO' | 'CONVERTIDO' | 'ABANDONADO';
export type LeadPriority = 'BAIXA' | 'MEDIA' | 'ALTA' | 'CRITICA';

export type Lead = {
  id: string;
  clientId: string;
  clientName?: string;
  clientDocument?: string;
  lawyerId: string;
  title: string;
  legalArea: string;
  status: LeadStatus;
  priority: LeadPriority;
  captureSource: string;
  referralName?: string;
  referralType?: string;
  isUrgent: boolean;
  prescriptionDate?: Timestamp;
  description?: string;
  driveFolderId?: string;
  opposingParties?: OpposingParty[];
  completedTasks?: string[]; 
  stageEntryDates?: Record<string, Timestamp>;
  interviewAnswers?: Record<string, string>;
  interviewerId?: string;
  aiAnalysis?: {
    summary?: string;
    legalAdvice?: string;
    score?: number;
    suggestedSteps?: string[];
    analyzedAt?: any;
  };
  timeline?: TimelineEvent[];
  interviews?: any[];
  interviewDate?: string;
  interviewTime?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

export type Process = {
  id: string;
  clientId: string;
  clientName?: string;
  clientDocument?: string;
  clientRole?: 'Polo Ativo' | 'Polo Passivo';
  secondaryClientIds?: string[];
  name: string;
  processNumber?: string;
  court?: string;
  courtAddress?: string;
  courtBranch?: string;
  courtPhone?: string;
  courtWebsite?: string;
  caseValue?: number;
  opposingParties?: OpposingParty[];
  description?: string;
  status: 'Ativo' | 'Arquivado' | 'Pendente';
  legalArea: string;
  responsibleStaffIds?: string[];
  teamParticipants?: TeamParticipant[];
  leadLawyerId?: string;
  commissionStaffId?: string; // ID do colaborador que receberá comissão
  defaultLocation?: string;
  driveFolderId?: string;
  globalDriveFolderId?: string;
  timeline?: TimelineEvent[];
  createdAt: Timestamp;
  updatedAt?: Timestamp;
};

export type HearingStatus = 'PENDENTE' | 'REALIZADA' | 'CANCELADA' | 'ADIADA';
export type HearingType = 'CONCILIACAO' | 'INSTRUCAO' | 'UNA' | 'JULGAMENTO' | 'PERICIA' | 'ATENDIMENTO' | 'DILIGENCIA' | 'OUTRA';
export type NotificationMethod = 'whatsapp' | 'email' | 'phone' | 'personal' | 'court' | 'other';

export type Hearing = {
  id: string;
  processId: string;
  processName?: string;
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
  meetingLink?: string;
  meetingPassword?: string;
  resultNotes?: string;
  hasFollowUp?: boolean;
  googleCalendarEventId?: string;
  createdAt?: Timestamp;
  clientNotified?: boolean;
  notificationMethod?: NotificationMethod;
  notificationDate?: Timestamp;
  rescheduledToId?: string;
  rescheduleReason?: string;
  expertName?: string;
  expertPhone?: string;
  cep?: string;
  locationName?: string;
  locationNumber?: string;
  locationComplement?: string;
  locationObservations?: string;
  requiresLawyer?: boolean;
  supportId?: string;
  supportName?: string;
  supportStatus?: 'PENDENTE' | 'REALIZADA' | 'REVISAO_SOLICITADA' | 'CONCLUIDA';
  supportNotes?: string;
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
  lawyerPercentage?: number;
  clientPercentage?: number;
};

export type FinancialTitle = {
  id: string;
  financialEventId?: string;
  processId?: string;
  clientId?: string;
  costCenter?: string;
  bankAccountId?: string;
  description: string;
  type: 'RECEITA' | 'DESPESA';
  category?: string;
  subcategory?: string;
  origin:
    | 'ACORDO'
    | 'SENTENCA'
    | 'HONORARIOS_CONTRATUAIS'
    | 'SUCUMBENCIA'
    | 'HONORARIOS_EXITO'
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
    | 'ADICIONAL'
    | 'CONTAS_CONSUMO'
    | 'ALVARA'
    | 'TRANSFERENCIAS_JUDICIAIS'
    | 'REPASSE_CLIENTE'
    | 'OUTRAS_RECEITAS'
    | 'INFRAESTRUTURA_IMOBILIARIA'
    | 'RECURSOS_HUMANOS'
    | 'LOGISTICA_VIAGENS'
    | 'DESPESAS_BANCARIAS'
    | 'COMISSAO'
    | 'RENDIMENTOS_INVESTIMENTOS';
  value: number;
  dueDate: any;
  paymentDate?: any;
  competenceDate?: any;
  status: 'PENDENTE' | 'PAGO' | 'ATRASADO' | 'CANCELADO';
  paymentMethod?: 'PIX' | 'BOLETO' | 'CARTAO' | 'TRANSFERENCIA' | 'DINHEIRO';
  beneficiaryName?: string;
  beneficiaryDocument?: string;
  pixKey?: string;
  receiptUrl?: string;
  notes?: string;
  paidToStaffId?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  recurrenceId?: string;
  installmentIndex?: number;
  totalInstallments?: number;
};

export type BankAccount = {
  id: string;
  name: string;
  bankName: string;
  type: 'CORRENTE' | 'POUPANCA' | 'INVESTIMENTO';
  balance: number;
  color?: string;
  isActive: boolean;
};

export type ReimbursementStatus = 'SOLICITADO' | 'APROVADO' | 'REEMBOLSADO' | 'NEGADO';

export type Reimbursement = {
  id: string;
  userId: string;
  userName: string;
  description: string;
  value: number;
  category?: string;
  paymentMethod?: string;
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

export type StaffStatus = 'ATIVO' | 'INATIVO' | 'BLOQUEADO' | 'PENDENTE_HOMOLOGACAO';
export type LegalType = 'PF' | 'PJ';
export type StaffRole = 'employee' | 'lawyer' | 'intern' | 'provider' | 'partner';
export type OABStatus = 'Ativa' | 'Suspensa' | 'Inativa' | 'Pendente';
export type RemunerationType = 'SUCUMBENCIA' | 'PRODUCAO' | 'QUOTA_LITIS' | 'FIXO_MENSAL' | 'AUDIENCISTA' | 'SOCIO';

export type StaffCreditStatus = 'RETIDO' | 'DISPONIVEL' | 'PAGO';
export type StaffCreditType = 'HONORARIOS' | 'REEMBOLSO' | 'SALARIO' | 'PRODUCAO' | 'BONUS' | 'DEBITO' | 'DIVIDENDOS';

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
  paymentForecast?: Timestamp;
  paidBy?: string;
  authorName?: string;
  monthKey?: string;
};

export type Staff = {
  id: string;
  role: StaffRole;
  engagementType: 'fixed' | 'correspondent';
  firstName: string;
  lastName: string;
  status: StaffStatus;
  legalType: LegalType;
  companyName?: string;
  cnpj?: string;
  email: string;
  phone?: string;
  whatsapp?: string;
  documentCPF?: string;
  documentRG?: string;
  nationality?: string;
  civilStatus?: string;
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
  
  // HR / DP Fields
  ctps?: string;
  pis?: string;
  admissionDate?: Timestamp;
  resignationDate?: Timestamp;
  birthDate?: Timestamp;
  gender?: string;
  education?: string;
  
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
    salary?: number; // CLT Salary
    profitPercentage?: number;
    paymentDay?: number; // Day of the month for payment
    commissionPercentage?: number; // Ex: 10
    commissionFixedValue?: number; // Ex: 50.00
    benefits?: {
      transportation?: number;
      food?: number;
      healthInsurance?: number;
      others?: number;
    };
    activityPrices?: {
      drafting?: number;
      diligence?: number;
      other?: number;
    };
    servicePrices?: Record<string, number>; // Custom prices per service type
  };
  parentStaffId?: string; // Link to a PJ office if this is a team member
  teamMembers?: string[]; // If PJ, list of associated staff names or IDs
  createdAt: Timestamp;
  updatedAt?: Timestamp;
};

export type CorrespondentService = {
  id: string;
  name: string;
  price: number;
  hasAdditionals: boolean;
  additionalDetails?: string;
};

export type CorrespondentStatus = 'ATIVO' | 'INATIVO' | 'BLOQUEADO' | 'PENDENTE_HOMOLOGACAO';

export type Correspondent = {
  id: string;
  name: string;
  type?: 'ESCRITORIO' | 'AUTONOMO';
  oab?: string;
  document: string; // CNPJ or CPF
  email: string;
  phone?: string;
  whatsapp?: string;
  legalArea: string[]; // Areas they cover
  locations: string[]; // Cities/States they cover
  services?: CorrespondentService[];
  status: CorrespondentStatus;
  rating?: number;
  bankInfo?: {
    bankName?: string;
    agency?: string;
    account?: string;
    pixKey?: string;
  };
  notes?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

export type PayrollStatus = 'DRAFT' | 'APPROVED' | 'PAID' | 'CANCELLED';

export type PayrollEntry = {
  id: string;
  staffId: string;
  staffName: string;
  monthKey: string; // "YYYY-MM"
  baseSalary: number;
  bonuses: { description: string; value: number }[];
  discounts: { description: string; value: number }[];
  netValue: number;
  status: PayrollStatus;
  paymentDate?: Timestamp;
  financialTitleId?: string; // Link to financial module
  notes?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
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

export type ChecklistItemType = 'YES_NO' | 'YES_NO_MAYBE' | 'TEXT' | 'NUMBER';

export type ChecklistItem = {
  id: string;
  label: string;
  type: ChecklistItemType;
  required: boolean;
  options?: string[];
  tag?: string; // Tag para reutilização em documentos
};

export type ChecklistTemplate = {
  id: string;
  title: string;
  description: string;
  category: string;
  items: ChecklistItem[];
  legalArea?: string;
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
  createdByName: string;
};

export type ChecklistExecution = {
  id: string;
  templateId: string;
  templateTitle: string;
  userId: string;
  userName: string;
  processId?: string;
  processName?: string;
  leadId?: string;
  leadTitle?: string;
  answers: Record<string, any>;
  status: 'COMPLETED' | 'DRAFT';
  executedAt: Timestamp;
  observations?: string;
};

export type SEOSettings = {
  title: string;
  description: string;
  keywords: string;
  googleAnalyticsId?: string;
  facebookPixelId?: string;
  canonicalUrl?: string;
};

export type Intimacao = {
  id: string;
  tipo: string;
  processo: string | null;
  dataDisponibilizacao: string | null;
  dataPublicacaoISO: string | null;
  orgao: string | null;
  descricao: string;
  lida: boolean;
  createdAt: string;
  raw: string;
};

export type TaskStatus = 'needsAction' | 'completed';

export type Task = {
  id: string;
  googleTaskId?: string;
  webViewLink?: string;
  title: string;
  notes?: string;
  status: TaskStatus;
  due?: Timestamp;
  completedAt?: Timestamp;
  userId: string;
  userName?: string;
  processId?: string; // Opcional: link com processo
  processName?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};
