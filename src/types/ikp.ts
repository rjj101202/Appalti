// IKP (Ideaal Klant Profiel) type definitions

export interface IKPData {
  // 1. Persoonlijke gegevens
  personalDetails: {
    companyName: string;
    kvkNumber: string;
    website?: string;
    linkedin?: string;
  };

  // 2. Contactpersoon
  contactPerson: {
    name: string;
    function: string;
    email: string;
    phone: string;
    linkedin?: string;
  };

  // 3. Organisatiegrootte
  organizationSize: {
    employees: number;
    revenue?: number; // in euros
    locations?: number;
  };

  // 4. Branche / Industrie
  industry: {
    primary: string;
    secondary?: string[];
    sbicodes?: string[];
  };

  // 5. Geografische dekking
  geographicCoverage: {
    regions: string[]; // e.g., ["Noord-Holland", "Zuid-Holland"]
    national: boolean;
    international: boolean;
    countries?: string[];
  };

  // 6. Producten / Diensten
  productsServices: {
    main: string[];
    description: string;
    uniqueSellingPoints?: string[];
  };

  // 7. Doelgroep
  targetAudience: {
    b2b: boolean;
    b2c: boolean;
    b2g: boolean;
    segments: string[];
    description?: string;
  };

  // 8. Bedrijfscultuur & Waarden
  culture: {
    coreValues: string[];
    workEnvironment: string;
    socialResponsibility?: string[];
  };

  // 9. Groeifase
  growthPhase: 'startup' | 'scaleup' | 'mature' | 'enterprise';

  // 10. Budget voor Aanbestedingen
  tenderBudget: {
    min: number;
    max: number;
    averageProjectSize?: number;
  };

  // 11. Ervaring met aanbestedingen
  tenderExperience: {
    level: 'none' | 'beginner' | 'intermediate' | 'expert';
    previousTenders?: number;
    successRate?: number; // percentage
  };

  // 12. Drijfveren voor aanbestedingen
  tenderMotivations: string[]; // e.g., ["growth", "stability", "innovation"]

  // 13. Soort opdrachten
  projectTypes: {
    categories: string[];
    preferredDuration: 'short' | 'medium' | 'long' | 'any';
    contractTypes: string[]; // e.g., ["fixed-price", "time-material"]
  };

  // 14. Samenwerkingsvoorkeuren
  collaborationPreferences: {
    consortium: boolean;
    subcontracting: boolean;
    mainContracting: boolean;
    preferredPartners?: string[];
  };

  // 15. CPV Codes
  cpvCodes: {
    primary: string[];
    secondary?: string[];
    description?: string[];
  };

  // Metadata
  metadata: {
    createdAt: Date;
    updatedAt: Date;
    completedSteps: number;
    lastCompletedStep: number;
  };
}

// Helper type for form steps
export interface IKPStep {
  id: number;
  title: string;
  description: string;
  fields: string[];
  required: boolean;
}

// Validation status for each step
export interface IKPValidation {
  stepId: number;
  isValid: boolean;
  errors?: string[];
}

// Options for select fields
export const IKP_OPTIONS = {
  growthPhase: [
    { value: 'startup', label: 'Startup (0-2 jaar)' },
    { value: 'scaleup', label: 'Scale-up (2-5 jaar)' },
    { value: 'mature', label: 'Volwassen (5-10 jaar)' },
    { value: 'enterprise', label: 'Enterprise (10+ jaar)' }
  ],
  
  experienceLevel: [
    { value: 'none', label: 'Geen ervaring' },
    { value: 'beginner', label: 'Beginner (1-5 tenders)' },
    { value: 'intermediate', label: 'Gemiddeld (5-20 tenders)' },
    { value: 'expert', label: 'Expert (20+ tenders)' }
  ],
  
  projectDuration: [
    { value: 'short', label: 'Kort (< 6 maanden)' },
    { value: 'medium', label: 'Middellang (6-12 maanden)' },
    { value: 'long', label: 'Lang (> 12 maanden)' },
    { value: 'any', label: 'Geen voorkeur' }
  ],
  
  motivations: [
    { value: 'growth', label: 'Groei & uitbreiding' },
    { value: 'stability', label: 'Stabiliteit & zekerheid' },
    { value: 'innovation', label: 'Innovatie & ontwikkeling' },
    { value: 'impact', label: 'Maatschappelijke impact' },
    { value: 'network', label: 'Netwerk uitbreiding' }
  ],
  
  regions: [
    'Groningen', 'Friesland', 'Drenthe', 'Overijssel', 'Flevoland',
    'Gelderland', 'Utrecht', 'Noord-Holland', 'Zuid-Holland', 'Zeeland',
    'Noord-Brabant', 'Limburg'
  ]
};