import { ObjectId } from 'mongodb';

// Base document interface
export interface BaseDocument {
  _id?: ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

// Company roles
export enum PlatformRole {
  SUPER_ADMIN = 'super_admin',
  ADMIN = 'admin',
  VIEWER = 'viewer'
}

export enum CompanyRole {
  OWNER = 'owner',
  ADMIN = 'admin',
  MEMBER = 'member',
  VIEWER = 'viewer'
}

// Company interface
export interface Company extends BaseDocument {
  name: string;
  kvkNumber?: string;
  tenantId: string; // Unique identifier for multi-tenancy
  isAppaltiInternal: boolean;
  settings?: {
    primaryColor?: string;
    logo?: string;
  };
}

// User interface
export interface User extends BaseDocument {
  auth0Id: string;
  email: string;
  name: string;
  avatar?: string;
  lastLogin?: Date;
}

// Membership interface (links users to companies with roles)
export interface Membership extends BaseDocument {
  userId: ObjectId;
  companyId: ObjectId;
  tenantId: string;
  companyRole: CompanyRole;
  platformRole?: PlatformRole; // Only for Appalti internal users
  isActive: boolean;
}

// IKP (Ideaal Klant Profiel) dimensions and items
export enum IKPDimension {
  ORGANISATIE = 'Organisatie',
  IMPACT = 'Impact',
  DIENSTVERLENING = 'Dienstverlening',
  ISSUE = 'Issue',
  FINANCIEEL = 'Financieel'
}

export interface IKPItem {
  dimension: IKPDimension;
  onderwerp: string;
  type: 'keuze' | 'checkboxes' | 'ckv' | 'text' | 'number';
  percentage?: number;
  options?: Array<{
    text: string;
    score: number;
  }>;
  value?: any; // The actual value filled in by user
}

// Predefined IKP structure
export const IKP_STRUCTURE: IKPItem[] = [
  {
    dimension: IKPDimension.ORGANISATIE,
    onderwerp: 'Soort organisatie',
    type: 'checkboxes',
    percentage: 15,
    options: [
      { text: 'Organisatie: geleid door Private Equity', score: 5 },
      { text: 'Groei- en veranderingsstrategie', score: 5 },
      { text: 'Anders', score: 0 }
    ]
  },
  {
    dimension: IKPDimension.ORGANISATIE,
    onderwerp: 'Besluitvorming in Nederland',
    type: 'keuze',
    percentage: 5
  },
  {
    dimension: IKPDimension.ORGANISATIE,
    onderwerp: 'Opdrachtgevers',
    type: 'ckv'
  },
  {
    dimension: IKPDimension.ORGANISATIE,
    onderwerp: 'Perspectief branche',
    type: 'ckv'
  },
  {
    dimension: IKPDimension.ORGANISATIE,
    onderwerp: 'Imago',
    type: 'ckv'
  },
  {
    dimension: IKPDimension.ORGANISATIE,
    onderwerp: 'Regio',
    type: 'ckv'
  },
  {
    dimension: IKPDimension.ORGANISATIE,
    onderwerp: 'Branche',
    type: 'ckv'
  },
  {
    dimension: IKPDimension.ORGANISATIE,
    onderwerp: 'Aantal medewerkers',
    type: 'number',
    percentage: 5
  },
  {
    dimension: IKPDimension.ORGANISATIE,
    onderwerp: 'Matchingselementen',
    type: 'text',
    percentage: 15
  },
  {
    dimension: IKPDimension.IMPACT,
    onderwerp: 'Positie in Kraljic matrix',
    type: 'keuze',
    percentage: 10
  },
  {
    dimension: IKPDimension.DIENSTVERLENING,
    onderwerp: 'Potentieel voor dienstverlening',
    type: 'keuze',
    percentage: 15
  },
  {
    dimension: IKPDimension.ISSUE,
    onderwerp: 'Vraagstukken',
    type: 'text',
    percentage: 20
  },
  {
    dimension: IKPDimension.FINANCIEEL,
    onderwerp: 'Contractwaarde',
    type: 'number',
    percentage: 10
  },
  {
    dimension: IKPDimension.FINANCIEEL,
    onderwerp: 'Samenwerkingsduur',
    type: 'number',
    percentage: 5
  },
  {
    dimension: IKPDimension.FINANCIEEL,
    onderwerp: 'Kredietwaardigheid',
    type: 'ckv'
  }
];

// Client Company interface
export interface ClientCompany extends BaseDocument {
  companyId: ObjectId; // Reference to the company that owns this client
  tenantId: string;
  name: string;
  kvkNumber: string;
  kvkData?: any; // Data from KVK API
  ikpProfile: IKPItem[]; // Filled IKP profile
  cpvCodes: string[]; // CPV codes for tender matching
  matchingKeywords?: string[];
  isActive: boolean;
}

// Tender interface
export interface Tender extends BaseDocument {
  clientCompanyId: ObjectId;
  tenantId: string;
  tenderNedId: string; // ID from TenderNed
  title: string;
  description: string;
  publicationDate: Date;
  deadline: Date;
  cpvCodes: string[];
  matchScore: number; // Calculated match percentage
  status: 'new' | 'accepted' | 'rejected' | 'in_progress' | 'completed';
  tenderData?: any; // Original data from TenderNed
}

// Bid stages
export enum BidStage {
  STORYLINE = 'storyline',
  VERSION_65 = 'version_65',
  VERSION_95 = 'version_95',
  FINISH = 'finish'
}

// Bid interface
export interface Bid extends BaseDocument {
  tenderId: ObjectId;
  clientCompanyId: ObjectId;
  companyId: ObjectId;
  tenantId: string;
  currentStage: BidStage;
  stages: {
    [BidStage.STORYLINE]?: {
      content: string;
      createdAt: Date;
      createdBy: ObjectId;
      aiSuggestions?: string[];
      documents?: string[]; // Document references
    };
    [BidStage.VERSION_65]?: {
      content: string;
      createdAt: Date;
      createdBy: ObjectId;
      reviewedBy?: ObjectId;
      aiReview?: string;
    };
    [BidStage.VERSION_95]?: {
      content: string;
      createdAt: Date;
      createdBy: ObjectId;
      reviewedBy?: ObjectId;
      aiReview?: string;
    };
    [BidStage.FINISH]?: {
      content: string;
      createdAt: Date;
      createdBy: ObjectId;
      finalDocument?: string; // URL to final document
    };
  };
  teamMembers: ObjectId[];
  isActive: boolean;
}