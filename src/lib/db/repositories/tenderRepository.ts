import { Collection, Db, ObjectId } from 'mongodb';
import { getDatabase } from '@/lib/mongodb';
import { CreateTenderInput, Tender, UpdateTenderInput } from '../models/Tender';

export class TenderRepository {
  private collection: Collection<Tender>;

  constructor(db: Db) {
    this.collection = db.collection<Tender>('tenders');
    this.collection.createIndex({ tenantId: 1, clientCompanyId: 1, status: 1, createdAt: -1 });
  }

  async create(input: CreateTenderInput): Promise<Tender> {
    const now = new Date();
    const tender: Tender = {
      tenantId: input.tenantId,
      clientCompanyId: new ObjectId(input.clientCompanyId),
      title: input.title,
      description: input.description,
      cpvCodes: input.cpvCodes || [],
      deadline: input.deadline ? new Date(input.deadline) : undefined,
      status: 'draft',
      createdAt: now,
      updatedAt: now,
      createdBy: new ObjectId(input.createdBy),
    };
    const res = await this.collection.insertOne(tender);
    return { ...tender, _id: res.insertedId };
  }

  async findById(id: string, tenantId: string): Promise<Tender | null> {
    return this.collection.findOne({ _id: new ObjectId(id), tenantId });
  }

  async findPaginated(tenantId: string, opts: { clientCompanyId?: string; limit: number; cursor?: string; status?: string }) {
    const filter: any = { tenantId };
    if (opts.clientCompanyId) filter.clientCompanyId = new ObjectId(opts.clientCompanyId);
    if (opts.status) filter.status = opts.status;
    if (opts.cursor) filter._id = { $lt: new ObjectId(opts.cursor) };
    const items = await this.collection.find(filter).sort({ _id: -1 }).limit(opts.limit).toArray();
    const nextCursor = items.length === opts.limit ? items[items.length - 1]._id?.toString() : undefined;
    return { items, nextCursor };
  }

  async update(id: string, tenantId: string, updates: UpdateTenderInput, updatedBy: string): Promise<Tender | null> {
    const res = await this.collection.findOneAndUpdate(
      { _id: new ObjectId(id), tenantId },
      { $set: { ...updates, updatedAt: new Date(), updatedBy: new ObjectId(updatedBy) } },
      { returnDocument: 'after' }
    );
    return res;
  }

  async delete(id: string, tenantId: string): Promise<boolean> {
    const res = await this.collection.deleteOne({ _id: new ObjectId(id), tenantId });
    return res.deletedCount > 0;
  }
}

let singleton: TenderRepository | null = null;
export async function getTenderRepository(): Promise<TenderRepository> {
  if (!singleton) {
    const db = await getDatabase();
    singleton = new TenderRepository(db);
  }
  return singleton;
}

