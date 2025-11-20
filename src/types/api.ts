/**
 * API Response Types voor Appalti Platform
 * 
 * Deze types vervangen 'any' en geven type safety aan API responses
 */

// ========================================
// Generic Response Types
// ========================================

export interface SuccessResponse<T = any> {
  success: true;
  data: T;
  message?: string;
}

export interface ErrorResponse {
  success: false;
  error: string;
  code: string;
  field?: string;
  details?: Record<string, any>;
}

export type ApiResponse<T = any> = SuccessResponse<T> | ErrorResponse;

// ========================================
// Pagination Types
// ========================================

export interface PaginationParams {
  limit?: number;
  cursor?: string;
  includeArchived?: boolean;
}

export interface PaginationMeta {
  hasMore: boolean;
  nextCursor: string | null;
  totalCount?: number;
}

export interface PaginatedResponse<T> {
  success: true;
  data: T[];
  pagination: PaginationMeta;
}

// ========================================
// Client Company Responses
// ========================================

export interface ClientCompanyData {
  _id: string;
  tenantId: string;
  linkedCompanyId?: string;
  name: string;
  kvkNumber?: string;
  legalForm?: string;
  isOwnCompany?: boolean;
  
  // Contact
  website?: string;
  websites?: string[];
  email?: string;
  phone?: string;
  emailDomain?: string; // Email domein voor team uitnodigingen
  
  // Address
  address?: {
    street: string;
    postalCode: string;
    city: string;
    country: string;
  };
  
  // Business
  sbiCode?: string;
  sbiDescription?: string;
  employees?: string;
  cpvCodes?: string[]; // CPV codes voor tender matching
  
  // Status
  status: 'active' | 'inactive' | 'archived';
  
  // IKP
  ikpStatus: 'not_started' | 'in_progress' | 'completed';
  ikpCompletedSteps?: number;
  ikpLastUpdated?: string;
  
  // Metadata
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy?: string;
}

export type ClientCompanyResponse = SuccessResponse<ClientCompanyData>;
export type ClientCompanyListResponse = PaginatedResponse<ClientCompanyData>;

// ========================================
// Bid & Tender Responses
// ========================================

export type BidStageKey = 'storyline' | 'version_65' | 'version_95' | 'final';
export type StageStatus = 'draft' | 'submitted' | 'pending_review' | 'approved' | 'rejected';

/**
 * Gunningscriterium voor API responses
 */
export interface BidCriterionData {
  id: string;
  title: string;
  content: string;
  order: number;
  createdAt?: string;
  updatedAt?: string;
  updatedBy?: string;
}

export interface BidStageData {
  key: BidStageKey;
  status: StageStatus;
  submittedAt?: string;
  approvedAt?: string;
  approvedBy?: string;
  content?: string; // DEPRECATED: gebruik 'criteria'
  criteria?: BidCriterionData[]; // Nieuwe structuur
  attachments?: Array<{
    name: string;
    url: string;
    size?: number;
    type?: string;
  }>;
  authorUserId?: string;
  assignedReviewer?: {
    id: string;
    name: string;
    email?: string;
  };
  sources?: Array<{
    label: string;
    type: 'client' | 'tender' | 'xai' | 'attachment';
    title?: string;
    url?: string;
    snippet?: string;
  }>;
}

export interface BidData {
  _id: string;
  tenantId: string;
  tenderId: string;
  clientCompanyId: string;
  currentStage: BidStageKey;
  stages: BidStageData[];
  assignedUserIds?: string[];
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy?: string;
}

export type BidResponse = SuccessResponse<BidData>;
export type BidListResponse = PaginatedResponse<BidData>;

export interface TenderData {
  _id: string;
  tenantId: string;
  clientCompanyId: string;
  source?: 'tenderned' | 'internal';
  externalId?: string;
  title: string;
  description?: string;
  cpvCodes?: string[];
  deadline?: string;
  status: 'draft' | 'in_review' | 'approved' | 'archived';
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export type TenderResponse = SuccessResponse<TenderData>;
export type TenderListResponse = PaginatedResponse<TenderData>;

// ========================================
// User & Membership Responses
// ========================================

export interface UserData {
  _id: string;
  auth0Id: string;
  email: string;
  name: string;
  avatar?: string;
  phoneNumber?: string;
  emailVerified: boolean;
  lastLogin?: string;
  createdAt: string;
  updatedAt: string;
}

export type UserResponse = SuccessResponse<UserData>;

export interface MembershipData {
  _id: string;
  userId: string;
  companyId: string;
  tenantId: string;
  companyRole: 'viewer' | 'member' | 'admin' | 'owner';
  platformRole?: 'viewer' | 'support' | 'admin' | 'super_admin';
  isActive: boolean;
  invitedBy?: string;
  invitedAt?: string;
  acceptedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export type MembershipResponse = SuccessResponse<MembershipData>;
export type MembershipListResponse = SuccessResponse<MembershipData[]>;

// ========================================
// Auth Responses
// ========================================

export interface SessionData {
  user: {
    id: string;
    email: string;
    name: string;
    avatar?: string;
    isAppaltiUser?: boolean;
    emailVerified?: boolean;
  };
  tenantId?: string;
  companyId?: string;
  companyRole?: string;
  platformRole?: string;
  expires: string;
}

export type SessionResponse = SuccessResponse<SessionData>;

export interface RegistrationStatusData {
  hasCompany: boolean;
  memberships: MembershipData[];
  pendingInvites: Array<{
    _id: string;
    companyId: string;
    companyName: string;
    invitedRole: string;
    invitedBy: string;
    expiresAt: string;
  }>;
}

export type RegistrationStatusResponse = SuccessResponse<RegistrationStatusData>;

// ========================================
// IKP Responses
// ========================================

export interface WeightedItem {
  id: string;
  value: string;
  weight: number;
}

export interface IKPData {
  geographicScope: string[];
  employeeCount: string[];
  clientTypes: WeightedItem[];
  industry: WeightedItem[];
  creditworthiness: 'yes' | 'no';
  clientDNA?: WeightedItem[];
  competitionType?: WeightedItem[];
  competitionCount?: WeightedItem[];
  kraljicPosition?: Record<string, number>;
  potentialServices?: WeightedItem[];
  additionalServices?: WeightedItem[];
  issues?: WeightedItem[];
  contractValue?: string[];
  grossMargin?: WeightedItem[];
  collaborationDuration?: string[];
  
  ckvStatus?: {
    geographicScope: boolean;
    employeeCount: boolean;
    clientTypes: boolean;
    industry: boolean;
    creditworthiness: boolean;
    allCkvMet: boolean;
  };
  
  metadata?: {
    createdAt: string;
    updatedAt: string;
    completedSteps: number;
    lastCompletedStep: number;
    totalScore?: number;
    ckvPassed?: boolean;
  };
}

export type IKPResponse = SuccessResponse<IKPData>;

// ========================================
// Knowledge & Documents Responses
// ========================================

export interface KnowledgeDocumentData {
  _id: string;
  tenantId: string;
  companyId?: string;
  scope: 'vertical' | 'horizontal';
  title: string;
  sourceUrl?: string;
  mimeType?: string;
  size?: number;
  checksum?: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export type KnowledgeDocumentResponse = SuccessResponse<KnowledgeDocumentData>;
export type KnowledgeDocumentListResponse = SuccessResponse<KnowledgeDocumentData[]>;

export interface KnowledgeSearchResult {
  documentId: string;
  title: string;
  snippet: string;
  score: number;
  sourceUrl?: string;
}

export interface KnowledgeSearchData {
  query: string;
  results: KnowledgeSearchResult[];
  totalResults: number;
}

export type KnowledgeSearchResponse = SuccessResponse<KnowledgeSearchData>;

// ========================================
// External API Responses
// ========================================

export interface KVKCompanyData {
  kvkNumber: string;
  name: string;
  legalForm?: string;
  businessActivity?: {
    sbiCode: string;
    sbiDescription: string;
  };
  addresses?: Array<{
    type: string;
    street: string;
    houseNumber: string;
    postalCode: string;
    city: string;
  }>;
  employees?: string;
  websites?: string[];
}

export type KVKSearchResponse = SuccessResponse<KVKCompanyData | KVKCompanyData[]>;

export interface TenderNedItem {
  id: string;
  title: string;
  buyer?: string;
  cpvCodes?: string[];
  sector?: string;
  publicationDate?: string;
  submissionDeadline?: string;
  sourceUrl?: string;
}

export interface TenderNedSearchData {
  items: TenderNedItem[];
  page: number;
  nextPage?: number;
  totalElements?: number;
  totalPages?: number;
}

export type TenderNedSearchResponse = SuccessResponse<TenderNedSearchData>;

// ========================================
// AI Generation Responses
// ========================================

export interface AIGenerationData {
  text: string;
  sources?: Array<{
    label: string;
    type: string;
    title?: string;
    url?: string;
    snippet?: string;
  }>;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export type AIGenerationResponse = SuccessResponse<AIGenerationData>;

export interface AIReviewData {
  suggestions: Array<{
    index: number;
    diagnose: string;
    improved: string;
    severity?: 'low' | 'medium' | 'high';
  }>;
  overallScore?: number;
  summary?: string;
}

export type AIReviewResponse = SuccessResponse<AIReviewData>;

