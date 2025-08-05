import { ObjectId } from 'mongodb';

export interface ClientCompany {
  _id?: ObjectId;
  tenantId: string; // For multi-tenancy
  
  // Basic company info
  name: string;
  kvkNumber?: string;
  legalForm?: string;
  
  // Contact details
  website?: string;
  email?: string;
  phone?: string;
  
  // Address
  address?: {
    street: string;
    postalCode: string;
    city: string;
    country: string;
  };
  
  // Business details
  sbiCode?: string;
  sbiDescription?: string;
  employees?: string;
  revenue?: number;
  
  // Status
  status: 'active' | 'inactive' | 'archived';
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  createdBy: string; // User ID
  updatedBy?: string;
  
  // IKP Status
  ikpStatus: 'not_started' | 'in_progress' | 'completed';
  ikpCompletedSteps?: number;
  ikpLastUpdated?: Date;
  ikpData?: any; // Store the actual IKP form data
}

export interface CreateClientCompanyInput {
  tenantId: string;
  name: string;
  kvkNumber?: string;
  createdBy: string;
  // Optional fields from KVK search
  legalForm?: string;
  address?: {
    street: string;
    postalCode: string;
    city: string;
    country: string;
  };
  sbiCode?: string;
  sbiDescription?: string;
  employees?: string;
}