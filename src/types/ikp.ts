// IKP (Ideaal Klant Profiel) type definitions

// Generic item with weight for reusable components
export interface WeightedItem {
  id: string;
  value: string;
  weight: number;
}

export interface IKPData {
  // 1. Geografische scope (CKV)
  geographicScope: string[]; // Provincies waar actief
  geographicScopeWeights?: Record<string, number>; // Wegingen per provincie
  
  // 2. Omvang in aantal werkzame personen (CKV)
  employeeCount: string[]; // Multiple selections mogelijk
  employeeCountWeights?: Record<string, number>; // Wegingen per grootte
  
  // 3. Opdrachtgevers (CKV)
  clientTypes: WeightedItem[]; // Vrij in te vullen met wegingen
  
  // 4. Branche (CKV)
  industry: WeightedItem[]; // Vrij in te vullen met wegingen
  
  // 5. Opdrachtgever DNA/matchingselementen (15%)
  clientDNA: WeightedItem[]; // Matchingselementen met wegingen
  
  // 6. Concurrentie - Soort (4%)
  competitionType: WeightedItem[]; // Vrij in te vullen concurrenten
  
  // 7. Concurrentie - Aantal (4%)
  competitionCount: WeightedItem[]; // Vrij in te vullen aantallen
  
  // 8. Impact - Positie in Kraljic matrix (10%)
  kraljicPosition: Record<string, number>; // 5 matrix punten met scores
  
  // 9. Dienstverlening - Potentiële dienstverlening (15%)
  potentialServices: WeightedItem[]; // Vrij in te vullen diensten
  
  // 10. Dienstverlening - Potentieel voor additionele dienstverlening (2%)
  additionalServices: WeightedItem[]; // Vrij in te vullen additionele diensten
  
  // 11. Issue - Vraagstukken (20%)
  issues: WeightedItem[]; // Vrij in te vullen vraagstukken
  
  // 12. Financieel - Potentieel contractwaarde (10%)
  contractValue: string[]; // Multiple selections
  contractValueWeights?: Record<string, number>; // Wegingen per range
  
  // 13. Financieel - Brutomarge (10%)
  grossMargin: WeightedItem[]; // Vrij in te vullen marges
  
  // 14. Samenwerkingsduur (10%)
  collaborationDuration: string[]; // Multiple selections
  collaborationDurationWeights?: Record<string, number>; // Wegingen per duur
  
  // 15. Kredietwaardigheid (CKV)
  creditworthiness: 'yes' | 'no'; // Ja of Nee
  
  // CKV Status - tracks if all CKV requirements are met
  ckvStatus?: {
    geographicScope: boolean;
    employeeCount: boolean;
    clientTypes: boolean;
    industry: boolean;
    creditworthiness: boolean;
    allCkvMet: boolean;
  };
  
  // Metadata
  metadata?: {
    createdAt: Date;
    updatedAt: Date;
    completedSteps: number;
    lastCompletedStep: number;
    totalScore?: number;
    ckvPassed?: boolean; // All CKV criteria passed
  };
}

// Helper type for form steps
export interface IKPStep {
  id: number;
  title: string;
  description: string;
  fields: string[];
  required: boolean;
  scoreType: 'CKV' | 'percentage'; // CKV = Critical Knock-out Value (harde eis)
  score: number; // Score weight for this step (0 for CKV, percentage for others)
}

// Validation status for each step
export interface IKPValidation {
  stepId: number;
  isValid: boolean;
  errors?: string[];
}

// Options for select fields
export const IKP_OPTIONS = {
  provinces: [
    'Groningen', 'Friesland', 'Drenthe', 'Overijssel', 'Flevoland',
    'Gelderland', 'Utrecht', 'Noord-Holland', 'Zuid-Holland', 'Zeeland',
    'Noord-Brabant', 'Limburg'
  ],
  
  employeeCount: [
    { value: '1-10', label: '1-10 medewerkers' },
    { value: '10-50', label: '10-50 medewerkers' },
    { value: '50-100', label: '50-100 medewerkers' },
    { value: '100-250', label: '100-250 medewerkers' },
    { value: '250-500', label: '250-500 medewerkers' },
    { value: '500+', label: '500+ medewerkers' }
  ],
  
  clientTypes: [
    { value: 'government', label: 'Overheid' },
    { value: 'semi-government', label: 'Semi-overheid' },
    { value: 'corporate', label: 'Bedrijfsleven' },
    { value: 'non-profit', label: 'Non-profit' },
    { value: 'healthcare', label: 'Zorg' },
    { value: 'education', label: 'Onderwijs' }
  ],
  
  industries: [
    { value: 'it', label: 'IT & Technologie' },
    { value: 'consultancy', label: 'Consultancy' },
    { value: 'construction', label: 'Bouw' },
    { value: 'logistics', label: 'Logistiek' },
    { value: 'healthcare', label: 'Gezondheidszorg' },
    { value: 'education', label: 'Onderwijs' },
    { value: 'finance', label: 'Financiële dienstverlening' },
    { value: 'retail', label: 'Retail' },
    { value: 'manufacturing', label: 'Productie' },
    { value: 'energy', label: 'Energie' }
  ],
  
  competitionType: [
    { value: 'direct', label: 'Directe concurrentie' },
    { value: 'indirect', label: 'Indirecte concurrentie' },
    { value: 'substitute', label: 'Substituten' },
    { value: 'mixed', label: 'Gemengd' }
  ],
  
  competitionCount: [
    { value: '0-5', label: '0-5 concurrenten' },
    { value: '6-10', label: '6-10 concurrenten' },
    { value: '11-20', label: '11-20 concurrenten' },
    { value: '20+', label: 'Meer dan 20 concurrenten' }
  ],
  
  kraljicMatrix: [
    { value: 'strategic', label: 'Strategisch' },
    { value: 'leverage', label: 'Hefboom' },
    { value: 'bottleneck', label: 'Knelpunt' },
    { value: 'routine', label: 'Routine' }
  ],
  
  contractValue: [
    { value: '<50k', label: '< €50.000' },
    { value: '50k-100k', label: '€50.000 - €100.000' },
    { value: '100k-250k', label: '€100.000 - €250.000' },
    { value: '250k-500k', label: '€250.000 - €500.000' },
    { value: '500k-1m', label: '€500.000 - €1.000.000' },
    { value: '1m-2.5m', label: '€1.000.000 - €2.500.000' },
    { value: '2.5m-5m', label: '€2.500.000 - €5.000.000' },
    { value: '5m-10m', label: '€5.000.000 - €10.000.000' },
    { value: '>10m', label: '> €10.000.000' }
  ],
  
  grossMargin: [
    { value: '0-10', label: '0-10%' },
    { value: '10-20', label: '10-20%' },
    { value: '20-30', label: '20-30%' },
    { value: '30-40', label: '30-40%' },
    { value: '40+', label: '40%+' }
  ],
  
  collaborationDuration: [
    { value: '<6months', label: '< 6 maanden' },
    { value: '6-12months', label: '6-12 maanden' },
    { value: '1-2years', label: '1-2 jaar' },
    { value: '2-3years', label: '2-3 jaar' },
    { value: '3-5years', label: '3-5 jaar' },
    { value: '5-10years', label: '5-10 jaar' },
    { value: '>10years', label: '> 10 jaar' }
  ],
  
  kraljicMatrix: [
    { value: 'supplier_all_leverancier', label: 'Supplier (alleen leverancier)' },
    { value: 'preferred_supplier', label: 'Preferred supplier (voorkeurleverancier)' },
    { value: 'solution_partner', label: 'Solution partner (mag meedenken)' },
    { value: 'strategic_partner', label: 'Strategic partner( mag strategisch meedenken)' },
    { value: 'trusted_partner', label: 'Trusted partner (gevraagd én ongevraagd)' }
  ],
  
  creditworthiness: [
    { value: 'yes', label: 'Ja' },
    { value: 'no', label: 'Nee' }
  ]
};