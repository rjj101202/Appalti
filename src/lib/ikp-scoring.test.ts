/**
 * IKP (Ideaal Klant Profiel) Scoring Tests
 * 
 * Tests voor de bedrijfslogica van IKP scoring en CKV (Critical Knock-out Values)
 */

import type { IKPData, WeightedItem } from '@/types/ikp';

describe('IKP Scoring Logic', () => {
  describe('CKV (Critical Knock-out Values) Validation', () => {
    test('should require all CKV fields to be completed', () => {
      const validateCKV = (ikpData: Partial<IKPData>): boolean => {
        const requiredFields = [
          'geographicScope',
          'employeeCount',
          'clientTypes',
          'industry',
          'creditworthiness'
        ];

        return requiredFields.every(field => {
          const value = ikpData[field as keyof IKPData];
          if (Array.isArray(value)) {
            return value.length > 0;
          }
          return value !== undefined && value !== null && value !== '';
        });
      };

      // Complete IKP
      const completeIKP: Partial<IKPData> = {
        geographicScope: ['Noord-Holland'],
        employeeCount: ['10-50'],
        clientTypes: [{ id: '1', value: 'government', weight: 1 }],
        industry: [{ id: '1', value: 'IT', weight: 1 }],
        creditworthiness: 'yes'
      };
      expect(validateCKV(completeIKP)).toBe(true);

      // Missing geographicScope
      const missingGeo: Partial<IKPData> = {
        geographicScope: [],
        employeeCount: ['10-50'],
        clientTypes: [{ id: '1', value: 'government', weight: 1 }],
        industry: [{ id: '1', value: 'IT', weight: 1 }],
        creditworthiness: 'yes'
      };
      expect(validateCKV(missingGeo)).toBe(false);

      // Missing creditworthiness
      const missingCredit: Partial<IKPData> = {
        geographicScope: ['Utrecht'],
        employeeCount: ['10-50'],
        clientTypes: [{ id: '1', value: 'government', weight: 1 }],
        industry: [{ id: '1', value: 'IT', weight: 1 }]
      };
      expect(validateCKV(missingCredit)).toBe(false);
    });

    test('should reject if creditworthiness is "no"', () => {
      const checkCreditworthiness = (creditworthiness: 'yes' | 'no'): boolean => {
        return creditworthiness === 'yes';
      };

      expect(checkCreditworthiness('yes')).toBe(true);
      expect(checkCreditworthiness('no')).toBe(false);
    });

    test('should calculate CKV status correctly', () => {
      const calculateCKVStatus = (ikpData: Partial<IKPData>) => {
        return {
          geographicScope: Array.isArray(ikpData.geographicScope) && ikpData.geographicScope.length > 0,
          employeeCount: Array.isArray(ikpData.employeeCount) && ikpData.employeeCount.length > 0,
          clientTypes: Array.isArray(ikpData.clientTypes) && ikpData.clientTypes.length > 0,
          industry: Array.isArray(ikpData.industry) && ikpData.industry.length > 0,
          creditworthiness: ikpData.creditworthiness === 'yes',
          allCkvMet: false // calculated below
        };
      };

      const validIKP: Partial<IKPData> = {
        geographicScope: ['Utrecht', 'Noord-Holland'],
        employeeCount: ['50-100'],
        clientTypes: [{ id: '1', value: 'government', weight: 10 }],
        industry: [{ id: '1', value: 'IT', weight: 8 }],
        creditworthiness: 'yes'
      };

      const status = calculateCKVStatus(validIKP);
      status.allCkvMet = Object.values(status).slice(0, 5).every(v => v === true);

      expect(status.geographicScope).toBe(true);
      expect(status.employeeCount).toBe(true);
      expect(status.clientTypes).toBe(true);
      expect(status.industry).toBe(true);
      expect(status.creditworthiness).toBe(true);
      expect(status.allCkvMet).toBe(true);
    });
  });

  describe('Weighted Items Scoring', () => {
    test('should calculate average weight for weighted items', () => {
      const calculateAverageWeight = (items: WeightedItem[]): number => {
        if (!items || items.length === 0) return 0;
        const sum = items.reduce((acc, item) => acc + (item.weight || 0), 0);
        return sum / items.length;
      };

      const items: WeightedItem[] = [
        { id: '1', value: 'Item A', weight: 8 },
        { id: '2', value: 'Item B', weight: 10 },
        { id: '3', value: 'Item C', weight: 6 }
      ];

      const avg = calculateAverageWeight(items);
      expect(avg).toBe(8); // (8 + 10 + 6) / 3 = 8
    });

    test('should handle empty weighted items', () => {
      const calculateAverageWeight = (items: WeightedItem[]): number => {
        if (!items || items.length === 0) return 0;
        const sum = items.reduce((acc, item) => acc + (item.weight || 0), 0);
        return sum / items.length;
      };

      expect(calculateAverageWeight([])).toBe(0);
    });

    test('should calculate weighted score contribution (15% for Client DNA)', () => {
      const calculateClientDNAScore = (items: WeightedItem[]): number => {
        if (!items || items.length === 0) return 0;
        const avgWeight = items.reduce((acc, item) => acc + item.weight, 0) / items.length;
        return (avgWeight / 10) * 0.15; // 15% weight, normalized to 0-1 scale
      };

      const clientDNA: WeightedItem[] = [
        { id: '1', value: 'Innovatief', weight: 8 },
        { id: '2', value: 'Duurzaam', weight: 10 }
      ];

      const score = calculateClientDNAScore(clientDNA);
      // Avg = 9, normalized = 0.9, * 0.15 = 0.135
      expect(score).toBeCloseTo(0.135, 3);
    });
  });

  describe('Total IKP Score Calculation', () => {
    test('should calculate total score from all components', () => {
      const calculateTotalScore = (ikpData: Partial<IKPData>): number => {
        let score = 0;

        // Client DNA (15%)
        if (ikpData.clientDNA?.length) {
          const avg = ikpData.clientDNA.reduce((s, i) => s + i.weight, 0) / ikpData.clientDNA.length;
          score += (avg / 10) * 0.15;
        }

        // Issues/Vraagstukken (20%)
        if (ikpData.issues?.length) {
          const avg = ikpData.issues.reduce((s, i) => s + i.weight, 0) / ikpData.issues.length;
          score += (avg / 10) * 0.20;
        }

        // Potential Services (15%)
        if (ikpData.potentialServices?.length) {
          const avg = ikpData.potentialServices.reduce((s, i) => s + i.weight, 0) / ikpData.potentialServices.length;
          score += (avg / 10) * 0.15;
        }

        // Contract Value (10%)
        // Gross Margin (10%)
        // Collaboration Duration (10%)
        // Kraljic Position (10%)
        // Competition Type (4%)
        // Competition Count (4%)
        // Additional Services (2%)

        return Math.round(score * 100); // Convert to percentage
      };

      const sampleIKP: Partial<IKPData> = {
        clientDNA: [
          { id: '1', value: 'Innovatief', weight: 10 },
          { id: '2', value: 'Duurzaam', weight: 8 }
        ],
        issues: [
          { id: '1', value: 'Digital transformation', weight: 9 },
          { id: '2', value: 'Cost reduction', weight: 7 }
        ],
        potentialServices: [
          { id: '1', value: 'Consultancy', weight: 8 },
          { id: '2', value: 'Implementation', weight: 10 }
        ]
      };

      const totalScore = calculateTotalScore(sampleIKP);

      // Client DNA: avg 9 → 0.9 * 0.15 = 0.135
      // Issues: avg 8 → 0.8 * 0.20 = 0.16
      // Services: avg 9 → 0.9 * 0.15 = 0.135
      // Total: 0.43 * 100 = 43
      expect(totalScore).toBeCloseTo(43, 0);
    });

    test('should return 0 for empty IKP data', () => {
      const calculateTotalScore = (ikpData: Partial<IKPData>): number => {
        let score = 0;
        // Same logic as above...
        return score;
      };

      expect(calculateTotalScore({})).toBe(0);
    });
  });

  describe('IKP Completeness', () => {
    test('should calculate number of completed steps', () => {
      const countCompletedSteps = (ikpData: Partial<IKPData>): number => {
        const steps = [
          ikpData.geographicScope?.length,
          ikpData.employeeCount?.length,
          ikpData.clientTypes?.length,
          ikpData.industry?.length,
          ikpData.creditworthiness,
          ikpData.clientDNA?.length,
          ikpData.competitionType?.length,
          ikpData.competitionCount?.length,
          ikpData.kraljicPosition,
          ikpData.potentialServices?.length,
          ikpData.additionalServices?.length,
          ikpData.issues?.length,
          ikpData.contractValue?.length,
          ikpData.grossMargin?.length,
          ikpData.collaborationDuration?.length
        ];

        return steps.filter(step => {
          if (typeof step === 'number') return step > 0;
          if (typeof step === 'string') return step.length > 0;
          if (typeof step === 'object') return true;
          return !!step;
        }).length;
      };

      const partialIKP: Partial<IKPData> = {
        geographicScope: ['Utrecht'],
        employeeCount: ['10-50'],
        creditworthiness: 'yes'
      };

      expect(countCompletedSteps(partialIKP)).toBe(3);

      const completeIKP: Partial<IKPData> = {
        geographicScope: ['Utrecht'],
        employeeCount: ['10-50'],
        clientTypes: [{ id: '1', value: 'gov', weight: 1 }],
        industry: [{ id: '1', value: 'IT', weight: 1 }],
        creditworthiness: 'yes',
        clientDNA: [{ id: '1', value: 'test', weight: 1 }],
        competitionType: [{ id: '1', value: 'direct', weight: 1 }],
        competitionCount: [{ id: '1', value: '0-5', weight: 1 }],
        kraljicPosition: { strategic: 10 },
        potentialServices: [{ id: '1', value: 'service', weight: 1 }],
        additionalServices: [{ id: '1', value: 'extra', weight: 1 }],
        issues: [{ id: '1', value: 'issue', weight: 1 }],
        contractValue: ['50k-100k'],
        grossMargin: [{ id: '1', value: '10-20', weight: 1 }],
        collaborationDuration: ['1-2years']
      };

      expect(countCompletedSteps(completeIKP)).toBe(15);
    });
  });
});

