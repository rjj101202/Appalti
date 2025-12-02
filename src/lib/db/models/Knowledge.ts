import { ObjectId } from 'mongodb';

export type KnowledgeScope = 'vertical' | 'horizontal';

/**
 * Document categories for client-level knowledge
 * - profile: Client profile documents (capabilities, USPs, team info, what makes them unique)
 * - previous_bids: Previous completed bid documents for reference
 * - general: General documents (default, for backwards compatibility)
 */
export type DocumentCategory = 'profile' | 'previous_bids' | 'general';

export interface KnowledgeDocument {
  _id?: ObjectId;
  tenantId: string;
  companyId?: ObjectId; // only for vertical docs
  scope: KnowledgeScope;
  category?: DocumentCategory; // Document category for organization
  title: string;
  sourceUrl?: string; // webUrl in SharePoint/OneDrive
  driveId?: string; // for SharePoint drive
  driveItemId?: string;
  userUpn?: string; // for OneDrive
  path?: string; // virtual path within library
  mimeType?: string;
  size?: number;
  checksum?: string; // content hash to avoid re-embed
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface KnowledgeChunk {
  _id?: ObjectId;
  tenantId: string;
  documentId: ObjectId;
  chunkIndex: number;
  text: string;
  embedding: number[];
  tokenCount?: number;
  pageNumber?: number;
  metadata?: Record<string, any>;
}