import { Collection, Db, ObjectId } from 'mongodb';
import { ClientCompany, CreateClientCompanyInput } from '../models/ClientCompany';
import { getDatabase } from '@/lib/mongodb';

export class ClientCompanyRepository {
  private collection: Collection<ClientCompany>;

  constructor(db: Db) {
    this.collection = db.collection<ClientCompany>('clientCompanies');
    
    // Create indexes
    this.collection.createIndex({ tenantId: 1, name: 1 });
    this.collection.createIndex({ tenantId: 1, kvkNumber: 1 });
    this.collection.createIndex({ tenantId: 1, status: 1 });
    this.collection.createIndex({ tenantId: 1, createdAt: -1, _id: -1 });
  }

  async create(input: CreateClientCompanyInput): Promise<ClientCompany> {
    const now = new Date();
    // Enforce at most one isOwnCompany per tenant
    if (input.isOwnCompany) {
      const existingOwn = await this.collection.findOne({ tenantId: input.tenantId, isOwnCompany: true });
      if (existingOwn) {
        throw new Error('An own company already exists for this tenant');
      }
    }
    const clientCompany: ClientCompany = {
      ...input,
      status: 'active',
      ikpStatus: 'not_started',
      createdAt: now,
      updatedAt: now
    };

    const result = await this.collection.insertOne(clientCompany);
    return { ...clientCompany, _id: result.insertedId };
  }

  async findById(id: string, tenantId: string): Promise<ClientCompany | null> {
    return await this.collection.findOne({ 
      _id: new ObjectId(id), 
      tenantId 
    });
  }

  async findByKvkNumber(kvkNumber: string, tenantId: string): Promise<ClientCompany | null> {
    return await this.collection.findOne({ 
      kvkNumber, 
      tenantId 
    });
  }

  async findAll(tenantId: string, includeArchived = false): Promise<ClientCompany[]> {
    const filter: any = { tenantId };
    
    if (!includeArchived) {
      filter.status = { $ne: 'archived' };
    }

    return await this.collection
      .find(filter)
      .sort({ createdAt: -1 })
      .toArray();
  }

  async findPaginated(
    tenantId: string,
    options: { limit: number; cursor?: string; includeArchived?: boolean }
  ): Promise<{ items: ClientCompany[]; nextCursor?: string }> {
    const filter: any = { tenantId };
    if (!options.includeArchived) {
      filter.status = { $ne: 'archived' };
    }

    if (options.cursor) {
      // Cursor is last seen _id
      filter._id = { $lt: new ObjectId(options.cursor) };
    }

    const items = await this.collection
      .find(filter)
      .sort({ _id: -1 })
      .limit(options.limit)
      .toArray();

    const nextCursor = items.length === options.limit ? items[items.length - 1]._id?.toString() : undefined;
    return { items, nextCursor };
  }

  async update(
    id: string, 
    tenantId: string, 
    updates: Partial<ClientCompany>,
    updatedBy: string
  ): Promise<ClientCompany | null> {
    // Prevent making multiple own companies by toggling updates
    if (updates.isOwnCompany === true) {
      const existingOwn = await this.collection.findOne({ tenantId, isOwnCompany: true, _id: { $ne: new ObjectId(id) } });
      if (existingOwn) {
        throw new Error('An own company already exists for this tenant');
      }
    }
    const result = await this.collection.findOneAndUpdate(
      { 
        _id: new ObjectId(id), 
        tenantId 
      },
      { 
        $set: {
          ...updates,
          updatedAt: new Date(),
          updatedBy
        }
      },
      { returnDocument: 'after' }
    );

    return result;
  }

  async updateIKPStatus(
    id: string,
    tenantId: string,
    ikpStatus: ClientCompany['ikpStatus'],
    completedSteps?: number
  ): Promise<boolean> {
    const result = await this.collection.updateOne(
      { 
        _id: new ObjectId(id), 
        tenantId 
      },
      { 
        $set: {
          ikpStatus,
          ikpCompletedSteps: completedSteps,
          ikpLastUpdated: new Date(),
          updatedAt: new Date()
        }
      }
    );

    return result.modifiedCount > 0;
  }

  async archive(id: string, tenantId: string): Promise<boolean> {
    const result = await this.collection.updateOne(
      { 
        _id: new ObjectId(id), 
        tenantId 
      },
      { 
        $set: {
          status: 'archived',
          updatedAt: new Date()
        }
      }
    );

    return result.modifiedCount > 0;
  }

  async delete(id: string, tenantId: string): Promise<boolean> {
    const result = await this.collection.deleteOne({ _id: new ObjectId(id), tenantId });
    return result.deletedCount > 0;
  }
}

// Singleton instance
let repository: ClientCompanyRepository | null = null;

export async function getClientCompanyRepository(): Promise<ClientCompanyRepository> {
  if (!repository) {
    const db = await getDatabase();
    repository = new ClientCompanyRepository(db);
  }
  return repository;
}