import { Collection, Db, ObjectId } from 'mongodb';
import { 
  Membership, 
  CreateMembershipInput, 
  UpdateMembershipInput,
  MembershipInvite,
  CompanyRole,
  PlatformRole 
} from '../models/Membership';
import { getDatabase } from '@/lib/mongodb';
import { nanoid } from 'nanoid';

export class MembershipRepository {
  private collection: Collection<Membership>;
  private inviteCollection: Collection<MembershipInvite>;

  constructor(db: Db) {
    this.collection = db.collection<Membership>('memberships');
    this.inviteCollection = db.collection<MembershipInvite>('membershipInvites');
    
    // Create indexes voor memberships
    this.collection.createIndex({ userId: 1, companyId: 1 }, { unique: true });
    this.collection.createIndex({ tenantId: 1, userId: 1 });
    this.collection.createIndex({ companyId: 1, isActive: 1 });
    this.collection.createIndex({ userId: 1, isActive: 1 });
    
    // Create indexes voor invites
    this.inviteCollection.createIndex({ inviteToken: 1 }, { unique: true });
    this.inviteCollection.createIndex({ email: 1, companyId: 1 });
    this.inviteCollection.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
  }

  /**
   * Create a new membership
   */
  async create(input: CreateMembershipInput): Promise<Membership> {
    const now = new Date();
    const membership: Membership = {
      userId: new ObjectId(input.userId),
      companyId: new ObjectId(input.companyId),
      tenantId: input.tenantId,
      companyRole: input.companyRole,
      platformRole: input.platformRole,
      isActive: true,
      permissions: input.permissions || [],
      invitedBy: input.invitedBy ? new ObjectId(input.invitedBy) : undefined,
      invitedAt: input.invitedBy ? now : undefined,
      acceptedAt: now,
      createdAt: now,
      updatedAt: now
    };

    const result = await this.collection.insertOne(membership);
    return { ...membership, _id: result.insertedId };
  }

  /**
   * Find membership by user and company
   */
  async findByUserAndCompany(
    userId: string, 
    companyId: string
  ): Promise<Membership | null> {
    return await this.collection.findOne({
      userId: new ObjectId(userId),
      companyId: new ObjectId(companyId)
    });
  }

  /**
   * Find all memberships for a user
   */
  async findByUser(
    userId: string, 
    activeOnly = true
  ): Promise<Membership[]> {
    const query: any = { userId: new ObjectId(userId) };
    
    if (activeOnly) {
      query.isActive = true;
    }

    return await this.collection
      .find(query)
      .sort({ createdAt: -1 })
      .toArray();
  }

  /**
   * Find all memberships for a company
   */
  async findByCompany(
    companyId: string,
    activeOnly = true
  ): Promise<Membership[]> {
    const query: any = { companyId: new ObjectId(companyId) };
    
    if (activeOnly) {
      query.isActive = true;
    }

    return await this.collection
      .find(query)
      .sort({ createdAt: -1 })
      .toArray();
  }

  /**
   * Find membership by ID
   */
  async findById(id: string): Promise<Membership | null> {
    return await this.collection.findOne({ _id: new ObjectId(id) });
  }

  /**
   * Count active owners for a company
   */
  async countActiveOwners(companyId: string): Promise<number> {
    return await this.collection.countDocuments({
      companyId: new ObjectId(companyId),
      isActive: true,
      companyRole: CompanyRole.OWNER,
    });
  }

  /**
   * Find memberships by tenant (voor multi-tenancy queries)
   */
  async findByTenant(
    tenantId: string,
    filter?: {
      userId?: string;
      isActive?: boolean;
      companyRole?: CompanyRole;
    }
  ): Promise<Membership[]> {
    const query: any = { tenantId };
    
    if (filter?.userId) {
      query.userId = new ObjectId(filter.userId);
    }
    
    if (filter?.isActive !== undefined) {
      query.isActive = filter.isActive;
    }
    
    if (filter?.companyRole) {
      query.companyRole = filter.companyRole;
    }

    return await this.collection
      .find(query)
      .sort({ createdAt: -1 })
      .toArray();
  }

  /**
   * Update membership
   */
  async update(
    id: string,
    updates: UpdateMembershipInput
  ): Promise<Membership | null> {
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
   * Deactivate membership
   */
  async deactivate(
    id: string,
    deactivatedBy: string,
    reason?: string
  ): Promise<boolean> {
    const result = await this.collection.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          isActive: false,
          deactivatedAt: new Date(),
          deactivatedBy: new ObjectId(deactivatedBy),
          deactivationReason: reason,
          updatedAt: new Date()
        }
      }
    );

    return result.modifiedCount > 0;
  }

  /**
   * Check if user has platform role
   */
  async hasPlatformRole(
    userId: string,
    requiredRole?: PlatformRole
  ): Promise<boolean> {
    const query: any = {
      userId: new ObjectId(userId),
      isActive: true,
      platformRole: { $exists: true }
    };

    if (requiredRole) {
      // Check for exact role or higher privileges
      const roleHierarchy = {
        [PlatformRole.VIEWER]: 0,
        [PlatformRole.SUPPORT]: 1,
        [PlatformRole.ADMIN]: 2,
        [PlatformRole.SUPER_ADMIN]: 3
      };

      const requiredLevel = roleHierarchy[requiredRole];
      const allowedRoles = Object.entries(roleHierarchy)
        .filter(([_, level]) => level >= requiredLevel)
        .map(([role]) => role);

      query.platformRole = { $in: allowedRoles };
    }

    const membership = await this.collection.findOne(query);
    return !!membership;
  }

  /**
   * Check if user has company role
   */
  async hasCompanyRole(
    userId: string,
    companyId: string,
    requiredRole?: CompanyRole
  ): Promise<boolean> {
    const query: any = {
      userId: new ObjectId(userId),
      companyId: new ObjectId(companyId),
      isActive: true
    };

    if (requiredRole) {
      // Check for exact role or higher privileges
      const roleHierarchy = {
        [CompanyRole.VIEWER]: 0,
        [CompanyRole.MEMBER]: 1,
        [CompanyRole.ADMIN]: 2,
        [CompanyRole.OWNER]: 3
      };

      const requiredLevel = roleHierarchy[requiredRole];
      const allowedRoles = Object.entries(roleHierarchy)
        .filter(([_, level]) => level >= requiredLevel)
        .map(([role]) => role);

      query.companyRole = { $in: allowedRoles };
    }

    const membership = await this.collection.findOne(query);
    return !!membership;
  }

  /**
   * Create membership invite
   */
  async createInvite(
    email: string,
    companyId: string,
    tenantId: string,
    invitedRole: CompanyRole,
    invitedBy: string
  ): Promise<MembershipInvite> {
    const now = new Date();
    const invite: MembershipInvite = {
      email: email.toLowerCase(),
      companyId: new ObjectId(companyId),
      tenantId,
      invitedRole,
      invitedBy: new ObjectId(invitedBy),
      inviteToken: nanoid(32),
      expiresAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000), // 7 dagen
      createdAt: now
    };

    const result = await this.inviteCollection.insertOne(invite);
    return { ...invite, _id: result.insertedId };
  }

  /**
   * Find invite by token
   */
  async findInviteByToken(token: string): Promise<MembershipInvite | null> {
    return await this.inviteCollection.findOne({
      inviteToken: token,
      expiresAt: { $gt: new Date() },
      acceptedAt: { $exists: false }
    });
  }

  /**
   * Accept invite
   */
  async acceptInvite(token: string): Promise<boolean> {
    const result = await this.inviteCollection.updateOne(
      {
        inviteToken: token,
        expiresAt: { $gt: new Date() },
        acceptedAt: { $exists: false }
      },
      {
        $set: {
          acceptedAt: new Date()
        }
      }
    );

    return result.modifiedCount > 0;
  }

  /**
   * Count memberships
   */
  async countByCompany(companyId: string, activeOnly = true): Promise<number> {
    const query: any = { companyId: new ObjectId(companyId) };
    
    if (activeOnly) {
      query.isActive = true;
    }

    return await this.collection.countDocuments(query);
  }

  /**
   * Transfer ownership
   */
  async transferOwnership(
    companyId: string,
    currentOwnerId: string,
    newOwnerId: string
  ): Promise<boolean> {
    const session = await this.collection.client.startSession();
    
    try {
      await session.withTransaction(async () => {
        // Downgrade current owner to admin
        await this.collection.updateOne(
          {
            userId: new ObjectId(currentOwnerId),
            companyId: new ObjectId(companyId),
            companyRole: CompanyRole.OWNER
          },
          {
            $set: {
              companyRole: CompanyRole.ADMIN,
              updatedAt: new Date()
            }
          },
          { session }
        );

        // Upgrade new owner
        await this.collection.updateOne(
          {
            userId: new ObjectId(newOwnerId),
            companyId: new ObjectId(companyId)
          },
          {
            $set: {
              companyRole: CompanyRole.OWNER,
              updatedAt: new Date()
            }
          },
          { session }
        );
      });

      return true;
    } catch (error) {
      console.error('Transfer ownership failed:', error);
      return false;
    } finally {
      await session.endSession();
    }
  }
}

// Singleton instance
let membershipRepository: MembershipRepository | null = null;

export async function getMembershipRepository(): Promise<MembershipRepository> {
  if (!membershipRepository) {
    const db = await getDatabase();
    membershipRepository = new MembershipRepository(db);
  }
  return membershipRepository;
}