import { Collection, Db, ObjectId } from 'mongodb';
import { getDatabase } from '@/lib/mongodb';
import { KnowledgeChunk, KnowledgeDocument } from '../models/Knowledge';

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, na = 0, nb = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) {
    const x = a[i];
    const y = b[i];
    dot += x * y;
    na += x * x;
    nb += y * y;
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb) + 1e-8;
  return dot / denom;
}

export class KnowledgeRepository {
  private docs: Collection<KnowledgeDocument>;
  private chunks: Collection<KnowledgeChunk>;

  constructor(db: Db) {
    this.docs = db.collection<KnowledgeDocument>('knowledge_documents');
    this.chunks = db.collection<KnowledgeChunk>('knowledge_chunks');

    this.docs.createIndex({ tenantId: 1, scope: 1, companyId: 1, path: 1 }, { name: 'docs_scope_path' });
    // Ensure unique index only applies to docs that came from external drives (driveItemId+userUpn present)
    // Some earlier deployments created this index without a partial filter, causing E11000 on uploads.
    // Try to self-heal by recreating the index with a partial filter if needed.
    (async () => {
      try {
        const idx = await this.docs.indexes();
        const existing = idx.find((i: any) => i.name === 'docs_item_unique');
        const wants = {
          key: { tenantId: 1, driveItemId: 1, userUpn: 1 },
          name: 'docs_item_unique',
          unique: true,
          sparse: true,
          partialFilterExpression: { driveItemId: { $exists: true }, userUpn: { $exists: true } },
        } as any;
        const needsFix = !existing || !existing.partialFilterExpression;
        if (needsFix && existing) {
          await this.docs.dropIndex('docs_item_unique').catch(() => {});
        }
        if (needsFix) {
          await this.docs.createIndex(wants.key, wants);
        }
      } catch (e) {
        console.warn('knowledgeRepository index ensure warning:', (e as any)?.message || e);
      }
    })();
    this.chunks.createIndex({ tenantId: 1, documentId: 1, chunkIndex: 1 }, { unique: true, name: 'chunks_idx' });
    // Atlas Vector Search index should be created separately on chunks.embedding
  }

  async upsertDocument(tenantId: string, doc: Omit<KnowledgeDocument, 'tenantId' | 'createdAt' | 'updatedAt'>): Promise<KnowledgeDocument> {
    const now = new Date();
    const filter: any = { tenantId };
    if (doc.driveItemId) filter.driveItemId = doc.driveItemId;
    if (doc.userUpn) filter.userUpn = doc.userUpn;
    if (!doc.driveItemId && !doc.userUpn && doc.path) filter.path = doc.path;
    // Clean undefined/null fields to avoid inserting explicit nulls (which may hit unique index)
    const toSetRaw: any = { ...doc };
    if (toSetRaw.driveItemId == null) delete toSetRaw.driveItemId;
    if (toSetRaw.userUpn == null) delete toSetRaw.userUpn;
    const toSet: Partial<KnowledgeDocument> = {
      ...toSetRaw,
      tenantId,
      updatedAt: now
    } as any;

    const res = await this.docs.findOneAndUpdate(
      filter,
      { $set: toSet, $unset: { driveItemId: toSetRaw.driveItemId == null ? '' : undefined, userUpn: toSetRaw.userUpn == null ? '' : undefined } as any, $setOnInsert: { createdAt: now } },
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

  async searchByEmbedding(tenantId: string, queryEmbedding: number[], topK: number, docFilter?: any): Promise<KnowledgeChunk[]> {
    // Preferred path: Atlas Vector Search (gated by env)
    const enableVector = String(process.env.ENABLE_VECTOR_SEARCH || '').toLowerCase() === 'true';
    try {
      if (!enableVector) throw new Error('Vector search disabled by env');
      const vectorFilter: any = { tenantId };
      const pipeline: any[] = [
        {
          $vectorSearch: {
            index: 'vector_index',
            path: 'embedding',
            queryVector: queryEmbedding,
            numCandidates: Math.max(50, topK * 5),
            limit: topK * 2,
            filter: vectorFilter
          }
        },
        {
          $lookup: {
            from: 'knowledge_documents',
            localField: 'documentId',
            foreignField: '_id',
            as: 'doc'
          }
        },
        { $unwind: '$doc' }
      ];

      const matchDoc: any = {};
      if (docFilter) {
        if (docFilter.scope) matchDoc['doc.scope'] = docFilter.scope;
        if (docFilter.companyId) matchDoc['doc.companyId'] = docFilter.companyId instanceof ObjectId ? docFilter.companyId : new ObjectId(String(docFilter.companyId));
        if (docFilter.tags && Array.isArray(docFilter.tags) && docFilter.tags.length) {
          matchDoc['doc.tags'] = { $in: docFilter.tags };
        }
        if (docFilter.pathIncludes) {
          const values = Array.isArray(docFilter.pathIncludes) ? docFilter.pathIncludes : [docFilter.pathIncludes];
          matchDoc['doc.path'] = { $regex: values.map((v: string) => v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), $options: 'i' };
        }
        if (docFilter.documentIds && Array.isArray(docFilter.documentIds) && docFilter.documentIds.length) {
          const ids = docFilter.documentIds.map((id: any) => id instanceof ObjectId ? id : new ObjectId(String(id)));
          matchDoc['doc._id'] = { $in: ids };
        }
      }
      if (Object.keys(matchDoc).length > 0) pipeline.push({ $match: matchDoc });
      pipeline.push({ $limit: topK });

      const res = await this.chunks.aggregate(pipeline).toArray();
      return res as any;
    } catch (e) {
      if (enableVector) {
        console.warn('Vector search unavailable, falling back to in-memory similarity:', (e as any)?.message || e);
      }
      // Fallback: fetch candidate chunks by filtered documents and rank in Node
      const docQuery: any = { tenantId };
      if (docFilter?.scope) docQuery.scope = docFilter.scope;
      if (docFilter?.companyId) docQuery.companyId = docFilter.companyId instanceof ObjectId ? docFilter.companyId : new ObjectId(String(docFilter.companyId));
      if (docFilter?.tags && Array.isArray(docFilter.tags) && docFilter.tags.length) {
        docQuery.tags = { $in: docFilter.tags };
      }
      if (docFilter?.pathIncludes) {
        const values = Array.isArray(docFilter.pathIncludes) ? docFilter.pathIncludes : [docFilter.pathIncludes];
        docQuery.path = { $regex: values.map((v: string) => v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), $options: 'i' };
      }
      if (docFilter?.documentIds && Array.isArray(docFilter.documentIds) && docFilter.documentIds.length) {
        const ids = docFilter.documentIds.map((id: any) => id instanceof ObjectId ? id : new ObjectId(String(id)));
        docQuery._id = { $in: ids };
      }
      const docs = await this.docs.find(docQuery).project({ _id: 1 }).toArray();
      if (!docs.length) return [] as any;
      const docIds = docs.map(d => d._id);
      const candidates = await this.chunks
        .find({ tenantId, documentId: { $in: docIds } })
        .limit(Math.max(500, topK * 50))
        .toArray();
      const scored = candidates
        .map(c => ({ c, score: cosineSimilarity(queryEmbedding, (c as any).embedding || []) }))
        .sort((a, b) => b.score - a.score)
        .slice(0, topK)
        .map(x => x.c);
      return scored as any;
    }
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