import { ObjectId } from 'mongodb';

export interface ClientCompany {
	_id?: ObjectId;
	tenantId: string; // For multi-tenancy
	linkedCompanyId?: ObjectId; // Company in eigen tenant voor client (voor teamleden/invites)
	
	// Basic company info
	name: string;
	kvkNumber?: string;
	legalForm?: string;
	isOwnCompany?: boolean; // true = eigen bedrijf binnen tenant
	
	// Contact details
	website?: string;
	websites?: string[];
	email?: string;
	phone?: string;
	
	// Address (primary)
	address?: {
		street: string;
		postalCode: string;
		city: string;
		country: string;
	};
	// Optional: multiple addresses from KVK
	addresses?: Array<{
		type?: string;
		street?: string;
		houseNumber?: string;
		postalCode?: string;
		city?: string;
		country?: string;
	}>;
	
	// Business details
	sbiCode?: string;
	sbiDescription?: string;
	employees?: string;
	revenue?: number;
	handelsnamen?: string[];
	
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
	
	// Raw KVK enriched payload (for later re-sync)
	kvkData?: any;
}

export interface CreateClientCompanyInput {
	tenantId: string;
	name: string;
	kvkNumber?: string;
	createdBy: string;
	isOwnCompany?: boolean;
	// Optional fields from KVK search
	legalForm?: string;
	address?: {
		street: string;
		postalCode: string;
		city: string;
		country: string;
	};
	addresses?: Array<{
		type?: string;
		street?: string;
		houseNumber?: string;
		postalCode?: string;
		city?: string;
		country?: string;
	}>;
	website?: string;
	websites?: string[];
	sbiCode?: string;
	sbiDescription?: string;
	employees?: string;
	handelsnamen?: string[];
	kvkData?: any;
}