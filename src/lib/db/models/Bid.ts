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
  authorUserId?: ObjectId;
  assignedReviewer?: { id: ObjectId; name: string; email?: string };
  citations?: string[]; // human-readable citation titles or urls
  sourceLinks?: string[]; // list of URLs used in generation
  sources?: Array<{
    label: string; // S1, S2, ...
    type: 'client' | 'tender' | 'xai' | 'attachment';
    title?: string;
    url?: string; // may be internal path for knowledge docs
    documentId?: ObjectId; // knowledge document id when applicable
    snippet?: string; // short excerpt used in generation
  }>;
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

