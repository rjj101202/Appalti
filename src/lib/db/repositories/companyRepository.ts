import { Collection, Db, ObjectId } from 'mongodb';
import { Company, CreateCompanyInput, UpdateCompanyInput } from '../models/Company';
import { getDatabase } from '@/lib/mongodb';
import { nanoid } from 'nanoid';

export class CompanyRepository {
  private collection: Collection<Company>;

  constructor(db: Db) {
    this.collection = db.collection<Company>('companies');
    
    // Create indexes
    this.collection.createIndex({ tenantId: 1 }, { unique: true });
    this.collection.createIndex({ kvkNumber: 1 }, { sparse: true });
    this.collection.createIndex({ name: 1 });
    this.collection.createIndex({ createdAt: -1 });
    this.collection.createIndex({ 'subscription.status': 1 });
  }

  /**
   * Generate unique tenantId
   */
  private generateTenantId(name: string): string {
    // Maak een URL-veilige tenant ID gebaseerd op bedrijfsnaam
    const base = name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 20);
    
    // Voeg een korte random string toe voor uniciteit
    return `${base}-${nanoid(6)}`;
  }

  /**
   * Create a new company
   */
  async create(input: CreateCompanyInput): Promise<Company> {
    const now = new Date();
    
    // Generate unique tenantId
    let tenantId = this.generateTenantId(input.name);
    
    // Check if tenantId already exists (unlikely maar mogelijk)
    let attempts = 0;
    while (await this.collection.findOne({ tenantId }) && attempts < 5) {
      tenantId = this.generateTenantId(input.name);
      attempts++;
    }
    
    if (attempts >= 5) {
      throw new Error('Could not generate unique tenant ID');
    }

    const company: Company = {
      name: input.name,
      kvkNumber: input.kvkNumber,
      tenantId,
      isAppaltiInternal: input.isAppaltiInternal ?? false,
      settings: input.settings || {},
      subscription: input.subscription || {
        plan: 'trial',
        status: 'active',
        startDate: now,
        endDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000), // 30 dagen trial
        maxUsers: 5,
        maxClientCompanies: 10
      },
      createdAt: now,
      updatedAt: now,
      createdBy: new ObjectId(input.createdBy)
    };

    const result = await this.collection.insertOne(company);
    return { ...company, _id: result.insertedId };
  }

  /**
   * Find company by ID
   */
  async findById(id: string): Promise<Company | null> {
    return await this.collection.findOne({ 
      _id: new ObjectId(id) 
    });
  }

  /**
   * Find company by tenantId
   */
  async findByTenantId(tenantId: string): Promise<Company | null> {
    return await this.collection.findOne({ tenantId });
  }

  /**
   * Find company by KVK number
   */
  async findByKvkNumber(kvkNumber: string): Promise<Company | null> {
    return await this.collection.findOne({ kvkNumber });
  }

  /**
   * Find all companies (voor admin dashboard)
   */
  async findAll(filter?: {
    isAppaltiInternal?: boolean;
    subscriptionStatus?: string;
  }): Promise<Company[]> {
    const query: any = {};
    
    if (filter?.isAppaltiInternal !== undefined) {
      query.isAppaltiInternal = filter.isAppaltiInternal;
    }
    
    if (filter?.subscriptionStatus) {
      query['subscription.status'] = filter.subscriptionStatus;
    }

    return await this.collection
      .find(query)
      .sort({ createdAt: -1 })
      .toArray();
  }

  /**
   * Update company
   */
  async update(
    id: string,
    updates: UpdateCompanyInput
  ): Promise<Company | null> {
    const result = await this.collection.findOneAndUpdate(
      { _id: new ObjectId(id) },
      {
        $set: {
          ...updates,
          updatedAt: new Date()
        }
      },
      { returnDocument: 'after' }
    );

    return result;
  }

  /**
   * Update company by tenantId
   */
  async updateByTenantId(
    tenantId: string,
    updates: UpdateCompanyInput
  ): Promise<Company | null> {
    const result = await this.collection.findOneAndUpdate(
      { tenantId },
      {
        $set: {
          ...updates,
          updatedAt: new Date()
        }
      },
      { returnDocument: 'after' }
    );

    return result;
  }

  /**
   * Update subscription status
   */
  async updateSubscription(
    tenantId: string,
    subscription: Partial<Company['subscription']>
  ): Promise<boolean> {
    const result = await this.collection.updateOne(
      { tenantId },
      {
        $set: {
          'subscription': { 
            ...subscription,
          },
          updatedAt: new Date()
        }
      }
    );

    return result.modifiedCount > 0;
  }

  /**
   * Check if company name is available
   */
  async isNameAvailable(name: string, excludeId?: string): Promise<boolean> {
    const query: any = { name: { $regex: new RegExp(`^${name}$`, 'i') } };
    
    if (excludeId) {
      query._id = { $ne: new ObjectId(excludeId) };
    }

    const existing = await this.collection.findOne(query);
    return !existing;
  }

  /**
   * Count companies
   */
  async count(filter?: { isAppaltiInternal?: boolean }): Promise<number> {
    return await this.collection.countDocuments(filter || {});
  }

  /**
   * Get Appalti internal company
   */
  async getAppaltiCompany(): Promise<Company | null> {
    return await this.collection.findOne({ isAppaltiInternal: true });
  }
}

// Singleton instance
let companyRepository: CompanyRepository | null = null;

export async function getCompanyRepository(): Promise<CompanyRepository> {
  if (!companyRepository) {
    const db = await getDatabase();
    companyRepository = new CompanyRepository(db);
  }
  return companyRepository;
}