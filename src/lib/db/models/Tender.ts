import { ObjectId } from 'mongodb';

export type TenderStatus = 'draft' | 'in_review' | 'approved' | 'archived';

export interface Tender {
  _id?: ObjectId;
  tenantId: string;
  clientCompanyId: ObjectId; // Link naar clientCompanies
  title: string;
  description?: string;
  cpvCodes?: string[];
  deadline?: Date;
  status: TenderStatus;
  createdAt: Date;
  updatedAt: Date;
  createdBy: ObjectId; // userId
  updatedBy?: ObjectId;
}

export interface CreateTenderInput {
  tenantId: string;
  clientCompanyId: string; // as string for API inputs
  title: string;
  description?: string;
  cpvCodes?: string[];
  deadline?: Date | string;
  createdBy: string; // userId as string
}

export interface UpdateTenderInput {
  title?: string;
  description?: string;
  cpvCodes?: string[];
  deadline?: Date | string;
  status?: TenderStatus;
}

