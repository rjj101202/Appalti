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
  }

  async create(input: CreateClientCompanyInput): Promise<ClientCompany> {
    const now = new Date();
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

  async update(
    id: string, 
    tenantId: string, 
    updates: Partial<ClientCompany>,
    updatedBy: string
  ): Promise<ClientCompany | null> {
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

// Export default instance for convenience
export default {
  async create(input: CreateClientCompanyInput) {
    const repo = await getClientCompanyRepository();
    return repo.create(input);
  },
  async findById(id: string, tenantId: string) {
    const repo = await getClientCompanyRepository();
    return repo.findById(id, tenantId);
  },
  async findByKvkNumber(kvkNumber: string, tenantId: string) {
    const repo = await getClientCompanyRepository();
    return repo.findByKvkNumber(kvkNumber, tenantId);
  },
  async findAll(tenantId: string, includeArchived = false) {
    const repo = await getClientCompanyRepository();
    return repo.findAll(tenantId, includeArchived);
  },
  async update(id: string, tenantId: string, updates: Partial<ClientCompany>, updatedBy: string) {
    const repo = await getClientCompanyRepository();
    return repo.update(id, tenantId, updates, updatedBy);
  },
  async updateIKPStatus(id: string, tenantId: string, updatedBy: string, ikpStatus: ClientCompany['ikpStatus'], completedSteps?: number) {
    const repo = await getClientCompanyRepository();
    return repo.updateIKPStatus(id, tenantId, updatedBy, ikpStatus, completedSteps);
  },
  async delete(id: string, tenantId: string) {
    const repo = await getClientCompanyRepository();
    return repo.delete(id, tenantId);
  }
};