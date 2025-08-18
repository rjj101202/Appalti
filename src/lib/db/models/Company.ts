import { ObjectId } from 'mongodb';

// Company document interface voor MongoDB
export interface Company {
  _id?: ObjectId;
  name: string;
  kvkNumber?: string;              // KVK nummer (optioneel)
  tenantId: string;                // Unieke identifier voor multi-tenancy
  isAppaltiInternal: boolean;      // Is dit Appalti zelf?
  settings?: {
    primaryColor?: string;         // Custom kleur voor UI
    logo?: string;                 // URL naar logo
    contactEmail?: string;
    contactPhone?: string;
    address?: {
      street?: string;
      city?: string;
      postalCode?: string;
      country?: string;
    };
    modes?: {
      enterprise?: boolean;        // Enterprise flow (Appalti schrijft, klant reviewt)
      self?: boolean;              // Self flow (bedrijf schrijft zelf)
    }
  };
  subscription?: {
    plan: 'trial' | 'basic' | 'professional' | 'enterprise';
    status: 'active' | 'suspended' | 'cancelled';
    startDate: Date;
    endDate?: Date;
    maxUsers?: number;
    maxClientCompanies?: number;
  };
  createdAt: Date;
  updatedAt: Date;
  createdBy: ObjectId;             // User die company aanmaakte
}

// Input voor het aanmaken van een nieuwe company
export interface CreateCompanyInput {
  name: string;
  kvkNumber?: string;
  isAppaltiInternal?: boolean;
  settings?: Company['settings'];
  subscription?: Company['subscription'];
  createdBy: string;               // userId
}

// Input voor het updaten van een company
export interface UpdateCompanyInput {
  name?: string;
  kvkNumber?: string;
  settings?: Company['settings'];
  subscription?: Company['subscription'];
}