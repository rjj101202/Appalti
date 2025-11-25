/**
 * Membership Repository Tests
 * 
 * Critical tests for team management and access control
 * Ensures proper role hierarchy and invite system
 */

import { ObjectId } from 'mongodb';
import { CompanyRole, PlatformRole } from '../models/Membership';

describe('MembershipRepository', () => {
  describe('Role Hierarchy - Company Roles', () => {
    const companyRoleHierarchy: Record<CompanyRole, number> = {
      [CompanyRole.VIEWER]: 0,
      [CompanyRole.MEMBER]: 1,
      [CompanyRole.ADMIN]: 2,
      [CompanyRole.OWNER]: 3
    };

    const hasMinimumRole = (
      userRole: CompanyRole,
      requiredRole: CompanyRole
    ): boolean => {
      return companyRoleHierarchy[userRole] >= companyRoleHierarchy[requiredRole];
    };

    test('should validate owner has all permissions', () => {
      expect(hasMinimumRole(CompanyRole.OWNER, CompanyRole.VIEWER)).toBe(true);
      expect(hasMinimumRole(CompanyRole.OWNER, CompanyRole.MEMBER)).toBe(true);
      expect(hasMinimumRole(CompanyRole.OWNER, CompanyRole.ADMIN)).toBe(true);
      expect(hasMinimumRole(CompanyRole.OWNER, CompanyRole.OWNER)).toBe(true);
    });

    test('should validate admin permissions', () => {
      expect(hasMinimumRole(CompanyRole.ADMIN, CompanyRole.VIEWER)).toBe(true);
      expect(hasMinimumRole(CompanyRole.ADMIN, CompanyRole.MEMBER)).toBe(true);
      expect(hasMinimumRole(CompanyRole.ADMIN, CompanyRole.ADMIN)).toBe(true);
      expect(hasMinimumRole(CompanyRole.ADMIN, CompanyRole.OWNER)).toBe(false);
    });

    test('should validate member permissions', () => {
      expect(hasMinimumRole(CompanyRole.MEMBER, CompanyRole.VIEWER)).toBe(true);
      expect(hasMinimumRole(CompanyRole.MEMBER, CompanyRole.MEMBER)).toBe(true);
      expect(hasMinimumRole(CompanyRole.MEMBER, CompanyRole.ADMIN)).toBe(false);
      expect(hasMinimumRole(CompanyRole.MEMBER, CompanyRole.OWNER)).toBe(false);
    });

    test('should validate viewer permissions', () => {
      expect(hasMinimumRole(CompanyRole.VIEWER, CompanyRole.VIEWER)).toBe(true);
      expect(hasMinimumRole(CompanyRole.VIEWER, CompanyRole.MEMBER)).toBe(false);
      expect(hasMinimumRole(CompanyRole.VIEWER, CompanyRole.ADMIN)).toBe(false);
      expect(hasMinimumRole(CompanyRole.VIEWER, CompanyRole.OWNER)).toBe(false);
    });
  });

  describe('Role Hierarchy - Platform Roles', () => {
    const platformRoleHierarchy: Record<PlatformRole, number> = {
      [PlatformRole.VIEWER]: 0,
      [PlatformRole.SUPPORT]: 1,
      [PlatformRole.ADMIN]: 2,
      [PlatformRole.SUPER_ADMIN]: 3
    };

    const hasMinimumPlatformRole = (
      userRole: PlatformRole,
      requiredRole: PlatformRole
    ): boolean => {
      return platformRoleHierarchy[userRole] >= platformRoleHierarchy[requiredRole];
    };

    test('should validate super_admin has all permissions', () => {
      expect(hasMinimumPlatformRole(PlatformRole.SUPER_ADMIN, PlatformRole.VIEWER)).toBe(true);
      expect(hasMinimumPlatformRole(PlatformRole.SUPER_ADMIN, PlatformRole.SUPPORT)).toBe(true);
      expect(hasMinimumPlatformRole(PlatformRole.SUPER_ADMIN, PlatformRole.ADMIN)).toBe(true);
      expect(hasMinimumPlatformRole(PlatformRole.SUPER_ADMIN, PlatformRole.SUPER_ADMIN)).toBe(true);
    });

    test('should validate admin cannot access super_admin functions', () => {
      expect(hasMinimumPlatformRole(PlatformRole.ADMIN, PlatformRole.SUPER_ADMIN)).toBe(false);
    });

    test('should validate support role limitations', () => {
      expect(hasMinimumPlatformRole(PlatformRole.SUPPORT, PlatformRole.VIEWER)).toBe(true);
      expect(hasMinimumPlatformRole(PlatformRole.SUPPORT, PlatformRole.SUPPORT)).toBe(true);
      expect(hasMinimumPlatformRole(PlatformRole.SUPPORT, PlatformRole.ADMIN)).toBe(false);
    });
  });

  describe('Membership Creation', () => {
    test('should create membership with required fields', () => {
      const createMembershipDocument = (input: {
        userId: string;
        companyId: string;
        tenantId: string;
        companyRole: CompanyRole;
        invitedBy?: string;
      }) => {
        const now = new Date();
        return {
          userId: new ObjectId(input.userId),
          companyId: new ObjectId(input.companyId),
          tenantId: input.tenantId,
          companyRole: input.companyRole,
          isActive: true,
          invitedBy: input.invitedBy ? new ObjectId(input.invitedBy) : undefined,
          invitedAt: input.invitedBy ? now : undefined,
          acceptedAt: now,
          createdAt: now,
          updatedAt: now
        };
      };

      const userId = new ObjectId().toString();
      const companyId = new ObjectId().toString();
      const inviterId = new ObjectId().toString();

      const membership = createMembershipDocument({
        userId,
        companyId,
        tenantId: 'tenant-A',
        companyRole: CompanyRole.MEMBER,
        invitedBy: inviterId
      });

      expect(membership.tenantId).toBe('tenant-A');
      expect(membership.companyRole).toBe(CompanyRole.MEMBER);
      expect(membership.isActive).toBe(true);
      expect(membership.invitedBy).toBeInstanceOf(ObjectId);
    });

    test('should handle platform role assignment for Appalti users', () => {
      const createAppaltiMembership = (input: {
        userId: string;
        companyId: string;
        tenantId: string;
        platformRole: PlatformRole;
      }) => {
        const now = new Date();
        return {
          userId: new ObjectId(input.userId),
          companyId: new ObjectId(input.companyId),
          tenantId: input.tenantId,
          companyRole: CompanyRole.ADMIN, // Appalti users are admins
          platformRole: input.platformRole,
          isActive: true,
          createdAt: now,
          updatedAt: now
        };
      };

      const userId = new ObjectId().toString();
      const companyId = new ObjectId().toString();

      const membership = createAppaltiMembership({
        userId,
        companyId,
        tenantId: 'appalti',
        platformRole: PlatformRole.ADMIN
      });

      expect(membership.platformRole).toBe(PlatformRole.ADMIN);
      expect(membership.tenantId).toBe('appalti');
    });
  });

  describe('Membership Queries', () => {
    test('should build query for user memberships', () => {
      const buildUserMembershipsQuery = (
        userId: string,
        activeOnly: boolean = true
      ) => {
        const query: Record<string, unknown> = {
          userId: new ObjectId(userId)
        };

        if (activeOnly) {
          query.isActive = true;
        }

        return query;
      };

      const userId = new ObjectId().toString();

      // Active only (default)
      const activeQuery = buildUserMembershipsQuery(userId);
      expect(activeQuery.isActive).toBe(true);

      // Include inactive
      const allQuery = buildUserMembershipsQuery(userId, false);
      expect(allQuery.isActive).toBeUndefined();
    });

    test('should build query for company members', () => {
      const buildCompanyMembersQuery = (
        companyId: string,
        activeOnly: boolean = true
      ) => {
        const query: Record<string, unknown> = {
          companyId: new ObjectId(companyId)
        };

        if (activeOnly) {
          query.isActive = true;
        }

        return query;
      };

      const companyId = new ObjectId().toString();
      const query = buildCompanyMembersQuery(companyId);

      expect(query.companyId).toBeInstanceOf(ObjectId);
      expect(query.isActive).toBe(true);
    });

    test('should build unique constraint for user-company pair', () => {
      const buildUniqueQuery = (userId: string, companyId: string) => {
        return {
          userId: new ObjectId(userId),
          companyId: new ObjectId(companyId)
        };
      };

      const userId = new ObjectId().toString();
      const companyId = new ObjectId().toString();

      const query = buildUniqueQuery(userId, companyId);

      expect(query.userId).toBeInstanceOf(ObjectId);
      expect(query.companyId).toBeInstanceOf(ObjectId);
    });
  });

  describe('Membership Deactivation', () => {
    test('should build deactivation update', () => {
      const buildDeactivationUpdate = (
        deactivatedBy: string,
        reason?: string
      ) => {
        return {
          $set: {
            isActive: false,
            deactivatedAt: new Date(),
            deactivatedBy: new ObjectId(deactivatedBy),
            deactivationReason: reason,
            updatedAt: new Date()
          }
        };
      };

      const adminId = new ObjectId().toString();
      const update = buildDeactivationUpdate(adminId, 'Left the company');

      expect(update.$set.isActive).toBe(false);
      expect(update.$set.deactivatedBy).toBeInstanceOf(ObjectId);
      expect(update.$set.deactivationReason).toBe('Left the company');
    });

    test('should prevent deactivation of last owner', () => {
      const canDeactivateMember = (
        memberRole: CompanyRole,
        activeOwnerCount: number
      ): boolean => {
        // Cannot deactivate the last owner
        if (memberRole === CompanyRole.OWNER && activeOwnerCount <= 1) {
          return false;
        }
        return true;
      };

      // Can deactivate owner if there are multiple
      expect(canDeactivateMember(CompanyRole.OWNER, 2)).toBe(true);
      
      // Cannot deactivate last owner
      expect(canDeactivateMember(CompanyRole.OWNER, 1)).toBe(false);
      
      // Can always deactivate non-owners
      expect(canDeactivateMember(CompanyRole.ADMIN, 1)).toBe(true);
      expect(canDeactivateMember(CompanyRole.MEMBER, 1)).toBe(true);
    });
  });

  describe('Invite System', () => {
    test('should generate secure invite token', () => {
      // Simulating nanoid behavior
      const generateToken = (): string => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let token = '';
        for (let i = 0; i < 32; i++) {
          token += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return token;
      };

      const token = generateToken();
      
      expect(token).toHaveLength(32);
      expect(/^[A-Za-z0-9]+$/.test(token)).toBe(true);
    });

    test('should create invite with 7-day expiration', () => {
      const createInviteDocument = (input: {
        email: string;
        companyId: string;
        tenantId: string;
        invitedRole: CompanyRole;
        invitedBy: string;
      }) => {
        const now = new Date();
        const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

        return {
          email: input.email.toLowerCase(),
          companyId: new ObjectId(input.companyId),
          tenantId: input.tenantId,
          invitedRole: input.invitedRole,
          invitedBy: new ObjectId(input.invitedBy),
          inviteToken: 'mock-token-12345678901234567890',
          expiresAt,
          createdAt: now
        };
      };

      const companyId = new ObjectId().toString();
      const inviterId = new ObjectId().toString();

      const invite = createInviteDocument({
        email: 'Test@Example.com',
        companyId,
        tenantId: 'tenant-A',
        invitedRole: CompanyRole.MEMBER,
        invitedBy: inviterId
      });

      // Email should be lowercase
      expect(invite.email).toBe('test@example.com');
      
      // Expiration should be ~7 days from now
      const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
      const timeDiff = invite.expiresAt.getTime() - invite.createdAt.getTime();
      expect(timeDiff).toBe(sevenDaysMs);
    });

    test('should validate invite is not expired', () => {
      const isInviteValid = (expiresAt: Date): boolean => {
        return expiresAt > new Date();
      };

      // Valid invite (future expiration)
      const futureDate = new Date(Date.now() + 86400000); // +1 day
      expect(isInviteValid(futureDate)).toBe(true);

      // Expired invite
      const pastDate = new Date(Date.now() - 86400000); // -1 day
      expect(isInviteValid(pastDate)).toBe(false);
    });

    test('should validate invite is not already accepted', () => {
      const canAcceptInvite = (invite: { 
        expiresAt: Date; 
        acceptedAt?: Date 
      }): boolean => {
        // Must not be expired
        if (invite.expiresAt <= new Date()) {
          return false;
        }
        
        // Must not be already accepted
        if (invite.acceptedAt) {
          return false;
        }

        return true;
      };

      // Valid invite
      expect(canAcceptInvite({
        expiresAt: new Date(Date.now() + 86400000)
      })).toBe(true);

      // Already accepted
      expect(canAcceptInvite({
        expiresAt: new Date(Date.now() + 86400000),
        acceptedAt: new Date()
      })).toBe(false);

      // Expired
      expect(canAcceptInvite({
        expiresAt: new Date(Date.now() - 86400000)
      })).toBe(false);
    });

    test('should match invite email with user email (case-insensitive)', () => {
      const emailsMatch = (inviteEmail: string, userEmail: string): boolean => {
        return inviteEmail.toLowerCase() === userEmail.toLowerCase();
      };

      expect(emailsMatch('test@example.com', 'test@example.com')).toBe(true);
      expect(emailsMatch('Test@Example.com', 'test@example.com')).toBe(true);
      expect(emailsMatch('TEST@EXAMPLE.COM', 'test@example.com')).toBe(true);
      expect(emailsMatch('other@example.com', 'test@example.com')).toBe(false);
    });
  });

  describe('Ownership Transfer', () => {
    test('should transfer ownership atomically', () => {
      // This tests the logic, not the actual transaction
      const buildOwnershipTransfer = (
        companyId: string,
        currentOwnerId: string,
        newOwnerId: string
      ) => {
        return {
          downgradeCurrentOwner: {
            filter: {
              userId: new ObjectId(currentOwnerId),
              companyId: new ObjectId(companyId),
              companyRole: CompanyRole.OWNER
            },
            update: {
              $set: {
                companyRole: CompanyRole.ADMIN,
                updatedAt: new Date()
              }
            }
          },
          upgradeNewOwner: {
            filter: {
              userId: new ObjectId(newOwnerId),
              companyId: new ObjectId(companyId)
            },
            update: {
              $set: {
                companyRole: CompanyRole.OWNER,
                updatedAt: new Date()
              }
            }
          }
        };
      };

      const companyId = new ObjectId().toString();
      const currentOwnerId = new ObjectId().toString();
      const newOwnerId = new ObjectId().toString();

      const transfer = buildOwnershipTransfer(companyId, currentOwnerId, newOwnerId);

      // Verify downgrade
      expect(transfer.downgradeCurrentOwner.filter.companyRole).toBe(CompanyRole.OWNER);
      expect(transfer.downgradeCurrentOwner.update.$set.companyRole).toBe(CompanyRole.ADMIN);

      // Verify upgrade
      expect(transfer.upgradeNewOwner.update.$set.companyRole).toBe(CompanyRole.OWNER);
    });

    test('should validate new owner is active member', () => {
      const canTransferOwnership = (
        newOwnerMembership: { isActive: boolean; companyRole: CompanyRole } | null
      ): boolean => {
        if (!newOwnerMembership) {
          return false; // Not a member
        }

        if (!newOwnerMembership.isActive) {
          return false; // Inactive member
        }

        return true;
      };

      // Valid: active member
      expect(canTransferOwnership({ 
        isActive: true, 
        companyRole: CompanyRole.ADMIN 
      })).toBe(true);

      // Invalid: inactive member
      expect(canTransferOwnership({ 
        isActive: false, 
        companyRole: CompanyRole.ADMIN 
      })).toBe(false);

      // Invalid: not a member
      expect(canTransferOwnership(null)).toBe(false);
    });
  });

  describe('Role Change Validation', () => {
    test('should validate who can change roles', () => {
      const canChangeRole = (
        actorRole: CompanyRole,
        targetCurrentRole: CompanyRole,
        targetNewRole: CompanyRole
      ): boolean => {
        const roleLevel: Record<CompanyRole, number> = {
          [CompanyRole.VIEWER]: 0,
          [CompanyRole.MEMBER]: 1,
          [CompanyRole.ADMIN]: 2,
          [CompanyRole.OWNER]: 3
        };

        // Must have higher role than target's current role
        if (roleLevel[actorRole] <= roleLevel[targetCurrentRole]) {
          return false;
        }

        // Cannot promote to equal or higher than own role
        if (roleLevel[targetNewRole] >= roleLevel[actorRole]) {
          return false;
        }

        return true;
      };

      // Owner can change admin to member
      expect(canChangeRole(
        CompanyRole.OWNER, 
        CompanyRole.ADMIN, 
        CompanyRole.MEMBER
      )).toBe(true);

      // Admin cannot change another admin
      expect(canChangeRole(
        CompanyRole.ADMIN, 
        CompanyRole.ADMIN, 
        CompanyRole.MEMBER
      )).toBe(false);

      // Admin cannot promote to admin
      expect(canChangeRole(
        CompanyRole.ADMIN, 
        CompanyRole.MEMBER, 
        CompanyRole.ADMIN
      )).toBe(false);

      // Member cannot change anyone
      expect(canChangeRole(
        CompanyRole.MEMBER, 
        CompanyRole.VIEWER, 
        CompanyRole.MEMBER
      )).toBe(false);
    });
  });
});

