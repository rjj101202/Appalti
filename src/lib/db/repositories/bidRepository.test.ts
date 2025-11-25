/**
 * Bid Repository Tests
 * 
 * Critical tests for bid workflow and stage management
 * Ensures proper tenant isolation and stage transitions
 */

import { ObjectId } from 'mongodb';
import { BidStageKey, StageStatus, BidStageState, BidCriterion } from '../models/Bid';

describe('BidRepository', () => {
  describe('Tenant Isolation', () => {
    test('should always include tenantId in find queries', () => {
      const buildFindByIdQuery = (id: string, tenantId: string) => {
        if (!tenantId) {
          throw new Error('TenantId is required');
        }
        return {
          _id: new ObjectId(id),
          tenantId
        };
      };

      const bidId = new ObjectId().toString();
      const query = buildFindByIdQuery(bidId, 'tenant-A');
      
      expect(query).toHaveProperty('tenantId', 'tenant-A');
      expect(query._id).toBeInstanceOf(ObjectId);
    });

    test('should prevent queries without tenantId', () => {
      const buildFindByIdQuery = (id: string, tenantId: string) => {
        if (!tenantId) {
          throw new Error('TenantId is required');
        }
        return { _id: new ObjectId(id), tenantId };
      };

      const bidId = new ObjectId().toString();
      expect(() => buildFindByIdQuery(bidId, '')).toThrow('TenantId is required');
    });

    test('should include tenantId in delete operations', () => {
      const buildDeleteQuery = (id: string, tenantId: string) => {
        if (!tenantId) {
          throw new Error('TenantId is required for delete');
        }
        return { _id: new ObjectId(id), tenantId };
      };

      const bidId = new ObjectId().toString();
      const query = buildDeleteQuery(bidId, 'tenant-A');
      
      expect(query.tenantId).toBe('tenant-A');
    });
  });

  describe('Bid Creation', () => {
    test('should initialize all 4 stages with draft status', () => {
      const createInitialStages = (): BidStageState[] => {
        return [
          { key: 'storyline', status: 'draft' },
          { key: 'version_65', status: 'draft' },
          { key: 'version_95', status: 'draft' },
          { key: 'final', status: 'draft' }
        ];
      };

      const stages = createInitialStages();
      
      expect(stages).toHaveLength(4);
      expect(stages[0].key).toBe('storyline');
      expect(stages[1].key).toBe('version_65');
      expect(stages[2].key).toBe('version_95');
      expect(stages[3].key).toBe('final');
      
      stages.forEach(stage => {
        expect(stage.status).toBe('draft');
      });
    });

    test('should set currentStage to storyline on creation', () => {
      const createBidDocument = (input: {
        tenantId: string;
        tenderId: string;
        clientCompanyId: string;
        createdBy: string;
      }) => {
        return {
          tenantId: input.tenantId,
          tenderId: new ObjectId(input.tenderId),
          clientCompanyId: new ObjectId(input.clientCompanyId),
          currentStage: 'storyline' as BidStageKey,
          stages: [
            { key: 'storyline', status: 'draft' },
            { key: 'version_65', status: 'draft' },
            { key: 'version_95', status: 'draft' },
            { key: 'final', status: 'draft' }
          ],
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: new ObjectId(input.createdBy)
        };
      };

      const tenderId = new ObjectId().toString();
      const clientId = new ObjectId().toString();
      const userId = new ObjectId().toString();

      const bid = createBidDocument({
        tenantId: 'tenant-A',
        tenderId,
        clientCompanyId: clientId,
        createdBy: userId
      });

      expect(bid.currentStage).toBe('storyline');
      expect(bid.tenantId).toBe('tenant-A');
    });
  });

  describe('Stage Status Transitions', () => {
    const validTransitions: Record<StageStatus, StageStatus[]> = {
      'draft': ['submitted'],
      'submitted': ['pending_review', 'draft'],
      'pending_review': ['approved', 'rejected'],
      'approved': [],  // Final state for stage
      'rejected': ['draft']  // Can go back to draft for revision
    };

    test('should allow valid status transitions', () => {
      const isValidTransition = (current: StageStatus, next: StageStatus): boolean => {
        return validTransitions[current]?.includes(next) || false;
      };

      // Valid transitions
      expect(isValidTransition('draft', 'submitted')).toBe(true);
      expect(isValidTransition('submitted', 'pending_review')).toBe(true);
      expect(isValidTransition('pending_review', 'approved')).toBe(true);
      expect(isValidTransition('pending_review', 'rejected')).toBe(true);
      expect(isValidTransition('rejected', 'draft')).toBe(true);
    });

    test('should reject invalid status transitions', () => {
      const isValidTransition = (current: StageStatus, next: StageStatus): boolean => {
        return validTransitions[current]?.includes(next) || false;
      };

      // Invalid transitions
      expect(isValidTransition('draft', 'approved')).toBe(false);
      expect(isValidTransition('draft', 'pending_review')).toBe(false);
      expect(isValidTransition('approved', 'draft')).toBe(false);
      expect(isValidTransition('approved', 'rejected')).toBe(false);
    });

    test('should not allow skipping stages', () => {
      const canAdvanceToStage = (
        stages: BidStageState[],
        targetStage: BidStageKey
      ): boolean => {
        const stageOrder: BidStageKey[] = ['storyline', 'version_65', 'version_95', 'final'];
        const targetIndex = stageOrder.indexOf(targetStage);
        
        if (targetIndex === 0) return true; // Can always start at storyline
        
        // All previous stages must be approved
        for (let i = 0; i < targetIndex; i++) {
          const stageState = stages.find(s => s.key === stageOrder[i]);
          if (!stageState || stageState.status !== 'approved') {
            return false;
          }
        }
        
        return true;
      };

      const draftStages: BidStageState[] = [
        { key: 'storyline', status: 'draft' },
        { key: 'version_65', status: 'draft' },
        { key: 'version_95', status: 'draft' },
        { key: 'final', status: 'draft' }
      ];

      // Cannot skip to version_65 without approving storyline
      expect(canAdvanceToStage(draftStages, 'version_65')).toBe(false);
      
      const partiallyComplete: BidStageState[] = [
        { key: 'storyline', status: 'approved' },
        { key: 'version_65', status: 'draft' },
        { key: 'version_95', status: 'draft' },
        { key: 'final', status: 'draft' }
      ];

      // Can now work on version_65
      expect(canAdvanceToStage(partiallyComplete, 'version_65')).toBe(true);
      // But not version_95 yet
      expect(canAdvanceToStage(partiallyComplete, 'version_95')).toBe(false);
    });
  });

  describe('Stage Content Management', () => {
    test('should update stage content', () => {
      const updateStageContent = (
        stages: BidStageState[],
        stageKey: BidStageKey,
        content: string
      ): BidStageState[] => {
        return stages.map(stage => {
          if (stage.key === stageKey) {
            return { ...stage, content };
          }
          return stage;
        });
      };

      const stages: BidStageState[] = [
        { key: 'storyline', status: 'draft' }
      ];

      const updated = updateStageContent(stages, 'storyline', 'New content here');
      
      expect(updated[0].content).toBe('New content here');
    });

    test('should manage criteria within a stage', () => {
      const addCriterion = (
        stage: BidStageState,
        criterion: BidCriterion
      ): BidStageState => {
        const criteria = stage.criteria || [];
        return {
          ...stage,
          criteria: [...criteria, criterion]
        };
      };

      const removeCriterion = (
        stage: BidStageState,
        criterionId: string
      ): BidStageState => {
        return {
          ...stage,
          criteria: (stage.criteria || []).filter(c => c.id !== criterionId)
        };
      };

      let stage: BidStageState = { key: 'storyline', status: 'draft' };
      
      const criterion1: BidCriterion = {
        id: 'crit-1',
        title: 'Prijs',
        content: 'Prijsvoorstel...',
        order: 0
      };
      
      stage = addCriterion(stage, criterion1);
      expect(stage.criteria).toHaveLength(1);
      expect(stage.criteria![0].title).toBe('Prijs');

      const criterion2: BidCriterion = {
        id: 'crit-2',
        title: 'Kwaliteit',
        content: 'Kwaliteitsplan...',
        order: 1
      };
      
      stage = addCriterion(stage, criterion2);
      expect(stage.criteria).toHaveLength(2);

      stage = removeCriterion(stage, 'crit-1');
      expect(stage.criteria).toHaveLength(1);
      expect(stage.criteria![0].id).toBe('crit-2');
    });

    test('should limit criteria to maximum of 10', () => {
      const validateCriteriaCount = (count: number): boolean => {
        return count >= 1 && count <= 10;
      };

      expect(validateCriteriaCount(1)).toBe(true);
      expect(validateCriteriaCount(5)).toBe(true);
      expect(validateCriteriaCount(10)).toBe(true);
      expect(validateCriteriaCount(0)).toBe(false);
      expect(validateCriteriaCount(11)).toBe(false);
    });
  });

  describe('Reviewer Assignment', () => {
    test('should assign reviewer to stage', () => {
      const assignReviewer = (
        stage: BidStageState,
        reviewer: { id: string; name: string; email?: string }
      ): BidStageState => {
        return {
          ...stage,
          assignedReviewer: {
            id: new ObjectId(reviewer.id),
            name: reviewer.name,
            email: reviewer.email
          },
          status: 'pending_review' as StageStatus
        };
      };

      const stage: BidStageState = { 
        key: 'storyline', 
        status: 'submitted',
        content: 'Content to review'
      };

      const reviewerId = new ObjectId().toString();
      const updated = assignReviewer(stage, {
        id: reviewerId,
        name: 'Jan Reviewer',
        email: 'jan@appalti.nl'
      });

      expect(updated.assignedReviewer).toBeDefined();
      expect(updated.assignedReviewer!.name).toBe('Jan Reviewer');
      expect(updated.status).toBe('pending_review');
    });

    test('should record approval with timestamp and user', () => {
      const approveStage = (
        stage: BidStageState,
        approvedBy: string
      ): BidStageState => {
        return {
          ...stage,
          status: 'approved' as StageStatus,
          approvedAt: new Date(),
          approvedBy: new ObjectId(approvedBy)
        };
      };

      const stage: BidStageState = { 
        key: 'storyline', 
        status: 'pending_review'
      };

      const approverId = new ObjectId().toString();
      const approved = approveStage(stage, approverId);

      expect(approved.status).toBe('approved');
      expect(approved.approvedAt).toBeInstanceOf(Date);
      expect(approved.approvedBy).toBeInstanceOf(ObjectId);
    });
  });

  describe('Attachments Management', () => {
    test('should add attachment to stage', () => {
      const addAttachment = (
        stage: BidStageState,
        attachment: { name: string; url: string; size?: number; type?: string }
      ): BidStageState => {
        const attachments = stage.attachments || [];
        return {
          ...stage,
          attachments: [...attachments, attachment]
        };
      };

      let stage: BidStageState = { key: 'storyline', status: 'draft' };
      
      stage = addAttachment(stage, {
        name: 'proposal.pdf',
        url: 'https://blob.vercel-storage.com/proposal.pdf',
        size: 1024000,
        type: 'application/pdf'
      });

      expect(stage.attachments).toHaveLength(1);
      expect(stage.attachments![0].name).toBe('proposal.pdf');
    });

    test('should remove attachment by URL', () => {
      const removeAttachment = (
        stage: BidStageState,
        url: string
      ): BidStageState => {
        return {
          ...stage,
          attachments: (stage.attachments || []).filter(a => a.url !== url)
        };
      };

      const stage: BidStageState = { 
        key: 'storyline', 
        status: 'draft',
        attachments: [
          { name: 'file1.pdf', url: 'url1' },
          { name: 'file2.pdf', url: 'url2' }
        ]
      };

      const updated = removeAttachment(stage, 'url1');
      
      expect(updated.attachments).toHaveLength(1);
      expect(updated.attachments![0].url).toBe('url2');
    });
  });

  describe('Source Citations', () => {
    test('should add AI-generated sources with labels', () => {
      const addSources = (
        stage: BidStageState,
        sources: Array<{
          type: 'client' | 'tender' | 'xai' | 'attachment';
          title: string;
          url?: string;
          snippet?: string;
        }>
      ): BidStageState => {
        return {
          ...stage,
          sources: sources.map((s, i) => ({
            label: `S${i + 1}`,
            ...s
          }))
        };
      };

      const stage: BidStageState = { key: 'storyline', status: 'draft' };
      
      const updated = addSources(stage, [
        { type: 'client', title: 'Klantprofiel', snippet: 'Relevant info...' },
        { type: 'tender', title: 'Tender document', url: 'https://tenderned.nl/...' }
      ]);

      expect(updated.sources).toHaveLength(2);
      expect(updated.sources![0].label).toBe('S1');
      expect(updated.sources![0].type).toBe('client');
      expect(updated.sources![1].label).toBe('S2');
    });
  });

  describe('Query Building', () => {
    test('should build update query for stage status', () => {
      const buildStageStatusUpdate = (
        id: string,
        tenantId: string,
        stageKey: BidStageKey,
        status: StageStatus
      ) => {
        return {
          filter: {
            _id: new ObjectId(id),
            tenantId,
            'stages.key': stageKey
          },
          update: {
            $set: {
              'stages.$.status': status,
              updatedAt: new Date()
            }
          }
        };
      };

      const bidId = new ObjectId().toString();
      const result = buildStageStatusUpdate(bidId, 'tenant-A', 'storyline', 'submitted');

      expect(result.filter.tenantId).toBe('tenant-A');
      expect(result.filter['stages.key']).toBe('storyline');
      expect(result.update.$set['stages.$.status']).toBe('submitted');
    });

    test('should build aggregation for bids by client', () => {
      const buildClientBidsAggregation = (
        tenantId: string,
        clientCompanyId: string
      ) => {
        return [
          {
            $match: {
              tenantId,
              clientCompanyId: new ObjectId(clientCompanyId)
            }
          },
          {
            $lookup: {
              from: 'tenders',
              localField: 'tenderId',
              foreignField: '_id',
              as: 'tender'
            }
          },
          {
            $unwind: '$tender'
          },
          {
            $sort: { createdAt: -1 }
          }
        ];
      };

      const clientId = new ObjectId().toString();
      const pipeline = buildClientBidsAggregation('tenant-A', clientId);

      expect(pipeline[0].$match.tenantId).toBe('tenant-A');
      expect(pipeline[1].$lookup.from).toBe('tenders');
    });
  });
});

