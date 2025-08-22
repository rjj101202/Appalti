import { Collection, Db, ObjectId } from 'mongodb';
import { getDatabase } from '@/lib/mongodb';
import { KnowledgeChunk, KnowledgeDocument } from '../models/Knowledge';

export class KnowledgeRepository {
  private docs: Collection<KnowledgeDocument>;
  private chunks: Collection<KnowledgeChunk>;

  constructor(db: Db) {
    this.docs = db.collection<KnowledgeDocument>('knowledge_documents');
    this.chunks = db.collection<KnowledgeChunk>('knowledge_chunks');

    this.docs.createIndex({ tenantId: 1, scope: 1, companyId: 1, path: 1 }, { name: 'docs_scope_path' });
    this.docs.createIndex({ tenantId: 1, driveItemId: 1, userUpn: 1 }, { unique: true, sparse: true, name: 'docs_item_unique' });
    this.chunks.createIndex({ tenantId: 1, documentId: 1, chunkIndex: 1 }, { unique: true, name: 'chunks_idx' });
    // Atlas Vector Search index should be created separately on chunks.embedding
  }

  async upsertDocument(tenantId: string, doc: Omit<KnowledgeDocument, 'tenantId' | 'createdAt' | 'updatedAt'>): Promise<KnowledgeDocument> {
    const now = new Date();
    const filter: any = { tenantId };
    if (doc.driveItemId) filter.driveItemId = doc.driveItemId;
    if (doc.userUpn) filter.userUpn = doc.userUpn;
    if (!doc.driveItemId && !doc.userUpn && doc.path) filter.path = doc.path;
    const toSet: KnowledgeDocument = {
      ...doc,
      tenantId,
      updatedAt: now,
      createdAt: now,
    } as any;

    const res = await this.docs.findOneAndUpdate(
      filter,
      { $set: toSet, $setOnInsert: { createdAt: now } },
      { upsert: true, returnDocument: 'after' }
    );
    return res as unknown as KnowledgeDocument;
  }

  async replaceChunks(tenantId: string, documentId: ObjectId, chunks: Array<Omit<KnowledgeChunk, '_id' | 'tenantId' | 'documentId'>>): Promise<number> {
    await this.chunks.deleteMany({ tenantId, documentId });
    if (chunks.length === 0) return 0;
    const docs = chunks.map((c, i) => ({ ...c, tenantId, documentId, chunkIndex: c.chunkIndex ?? i }));
    const res = await this.chunks.insertMany(docs as any);
    return res.insertedCount;
  }

  async searchByEmbedding(tenantId: string, queryEmbedding: number[], topK: number, filter?: any): Promise<KnowledgeChunk[]> {
    // Uses MongoDB Atlas Vector Search. Assumes index named 'vector_index' on field 'embedding'.
    const pipeline: any[] = [
      { $match: { tenantId, ...(filter || {}) } },
      {
        $vectorSearch: {
          index: 'vector_index',
          path: 'embedding',
          queryVector: queryEmbedding,
          numCandidates: Math.max(50, topK * 5),
          limit: topK
        }
      }
    ];
    const res = await this.chunks.aggregate(pipeline).toArray();
    return res as any;
  }

  async getDocumentById(id: string, tenantId: string): Promise<KnowledgeDocument | null> {
    return this.docs.findOne({ _id: new ObjectId(id), tenantId });
  }
}

let singleton: KnowledgeRepository | null = null;
export async function getKnowledgeRepository(): Promise<KnowledgeRepository> {
  if (!singleton) {
    const db = await getDatabase();
    singleton = new KnowledgeRepository(db);
  }
  return singleton;
}