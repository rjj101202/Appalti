import { Collection, Db, ObjectId } from 'mongodb';
import { getDatabase } from '@/lib/mongodb';
import { Bid, BidStageKey, StageStatus, CreateBidInput } from '../models/Bid';

export class BidRepository {
  private collection: Collection<Bid>;

  constructor(db: Db) {
    this.collection = db.collection<Bid>('bids');
    this.collection.createIndex({ tenantId: 1, tenderId: 1, clientCompanyId: 1 });
  }

  async create(input: CreateBidInput): Promise<Bid> {
    const now = new Date();
    const initialStage: Bid['stages'] = [
      { key: 'storyline', status: 'draft' },
      { key: 'version_65', status: 'draft' },
      { key: 'version_80', status: 'draft' },
      { key: 'final', status: 'draft' },
    ];
    const bid: Bid = {
      tenantId: input.tenantId,
      tenderId: new ObjectId(input.tenderId),
      clientCompanyId: new ObjectId(input.clientCompanyId),
      currentStage: 'storyline',
      stages: initialStage,
      createdAt: now,
      updatedAt: now,
      createdBy: new ObjectId(input.createdBy)
    };
    const res = await this.collection.insertOne(bid);
    return { ...bid, _id: res.insertedId };
  }

  async findById(id: string, tenantId: string): Promise<Bid | null> {
    return this.collection.findOne({ _id: new ObjectId(id), tenantId });
  }

  async updateStageStatus(id: string, tenantId: string, stage: BidStageKey, status: StageStatus): Promise<boolean> {
    const res = await this.collection.updateOne(
      { _id: new ObjectId(id), tenantId, 'stages.key': stage },
      { $set: { 'stages.$.status': status, updatedAt: new Date() } }
    );
    return res.modifiedCount > 0;
  }
}

let singleton: BidRepository | null = null;
export async function getBidRepository(): Promise<BidRepository> {
  if (!singleton) {
    const db = await getDatabase();
    singleton = new BidRepository(db);
  }
  return singleton;
}

