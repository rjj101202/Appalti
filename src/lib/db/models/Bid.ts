import { ObjectId } from 'mongodb';

export type BidStageKey = 'storyline' | 'version_65' | 'version_95' | 'final';
export type StageStatus = 'draft' | 'submitted' | 'pending_review' | 'approved' | 'rejected';

export interface BidStageState {
  key: BidStageKey;
  status: StageStatus;
  submittedAt?: Date;
  approvedAt?: Date;
  approvedBy?: ObjectId; // userId
  feedbackThreadId?: ObjectId;
  content?: string;
  attachments?: { name: string; url: string; size?: number; type?: string }[];
}

export interface Bid {
  _id?: ObjectId;
  tenantId: string;
  tenderId: ObjectId;
  clientCompanyId: ObjectId;
  currentStage: BidStageKey;
  stages: BidStageState[];
  assignedUserIds?: ObjectId[]; // wie werkt eraan
  createdAt: Date;
  updatedAt: Date;
  createdBy: ObjectId;
  updatedBy?: ObjectId;
}

export interface CreateBidInput {
  tenantId: string;
  tenderId: string;
  clientCompanyId: string;
  createdBy: string;
}

export interface SubmitStageInput {
  stage: BidStageKey;
  note?: string;
}

