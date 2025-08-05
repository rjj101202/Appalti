// IKP (Ideaal Klant Profiel) type definitions

export interface IKPData {
  // 1. Organisatie (15%)
  organisationType: string; // e.g., "Soort organisatie"
  
  // 2. Besluitvorming in Nederland (5%)
  decisionMakingLocation: string;
  
  // 3. Opdrachtgevers (CKV)
  clientTypes: string[];
  
  // 4. Perspectief branche (CKV)
  industryPerspective: string;
  
  // 5. Imago (CKV)
  organizationImage: string;
  
  // 6. Regio (CKV)
  activeRegions: string[];
  
  // 7. Branche (CKV)
  industry: string;
  
  // 8. Aantal medewerkers (5%)
  employeeCount: string; // e.g., "1-10", "10-50", etc.
  
  // 9. Matchingselementen (15%)
  matchingElements: string[];
  
  // 10. Impact - Positie in Kraljic matrix (10%)
  kraljicPosition: string;
  
  // 11. Dienstverlening - Potentieel voor dienstverlening (15%)
  servicePotential: string;
  
  // 12. Issue - Vraagstukken (20%)
  issues: string[];
  
  // 13. Financieel - Contractwaarde (10%)
  contractValue: string;
  
  // 14. Samenwerkingsduur (5%)
  collaborationDuration: string;
  
  // 15. Kredietwaardigheid (CKV)
  creditworthiness: string;
  
  // Metadata
  metadata?: {
    createdAt: Date;
    updatedAt: Date;
    completedSteps: number;
    lastCompletedStep: number;
    totalScore?: number;
  };
}

// Helper type for form steps
export interface IKPStep {
  id: number;
  title: string;
  description: string;
  fields: string[];
  required: boolean;
  score?: number; // Score weight for this step
}

// Validation status for each step
export interface IKPValidation {
  stepId: number;
  isValid: boolean;
  errors?: string[];
}

// Options for select fields
export const IKP_OPTIONS = {
  organisationType: [
    { value: 'private_equity', label: 'Organisatie: geleid door Private Equity' },
    { value: 'growth_strategy', label: 'Groei- en veranderingsstrategie' },
    { value: 'other', label: 'Anders' }
  ],
  
  decisionMaking: [
    { value: 'yes', label: 'Ja' },
    { value: 'no', label: 'Nee' },
    { value: 'partial', label: 'Gedeeltelijk' }
  ],
  
  employeeCount: [
    { value: '1-10', label: '1-10 medewerkers' },
    { value: '10-50', label: '10-50 medewerkers' },
    { value: '50-100', label: '50-100 medewerkers' },
    { value: '100-250', label: '100-250 medewerkers' },
    { value: '250-500', label: '250-500 medewerkers' },
    { value: '500+', label: '500+ medewerkers' }
  ],
  
  kraljicMatrix: [
    { value: 'strategic', label: 'Strategisch' },
    { value: 'leverage', label: 'Hefboom' },
    { value: 'bottleneck', label: 'Knelpunt' },
    { value: 'routine', label: 'Routine' }
  ],
  
  servicePotential: [
    { value: 'high', label: 'Hoog potentieel' },
    { value: 'medium', label: 'Gemiddeld potentieel' },
    { value: 'low', label: 'Laag potentieel' }
  ],
  
  contractValue: [
    { value: '<100k', label: '< €100.000' },
    { value: '100k-500k', label: '€100.000 - €500.000' },
    { value: '500k-1m', label: '€500.000 - €1.000.000' },
    { value: '1m-5m', label: '€1.000.000 - €5.000.000' },
    { value: '>5m', label: '> €5.000.000' }
  ],
  
  collaborationDuration: [
    { value: '<1year', label: '< 1 jaar' },
    { value: '1-3years', label: '1-3 jaar' },
    { value: '3-5years', label: '3-5 jaar' },
    { value: '>5years', label: '> 5 jaar' }
  ],
  
  creditworthiness: [
    { value: 'excellent', label: 'Uitstekend' },
    { value: 'good', label: 'Goed' },
    { value: 'sufficient', label: 'Voldoende' },
    { value: 'insufficient', label: 'Onvoldoende' }
  ],
  
  regions: [
    'Groningen', 'Friesland', 'Drenthe', 'Overijssel', 'Flevoland',
    'Gelderland', 'Utrecht', 'Noord-Holland', 'Zuid-Holland', 'Zeeland',
    'Noord-Brabant', 'Limburg'
  ]
};