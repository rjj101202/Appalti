import { IKPStep } from '@/types/ikp';

export const IKP_STEPS: IKPStep[] = [
  {
    id: 1,
    title: 'Persoonlijke gegevens',
    description: 'Basisinformatie over het bedrijf',
    fields: ['companyName', 'kvkNumber', 'website', 'linkedin'],
    required: true
  },
  {
    id: 2,
    title: 'Contactpersoon',
    description: 'Primaire contactpersoon voor aanbestedingen',
    fields: ['name', 'function', 'email', 'phone', 'linkedin'],
    required: true
  },
  {
    id: 3,
    title: 'Organisatiegrootte',
    description: 'Grootte en omvang van de organisatie',
    fields: ['employees', 'revenue', 'locations'],
    required: true
  },
  {
    id: 4,
    title: 'Branche / Industrie',
    description: 'Sector waarin het bedrijf actief is',
    fields: ['primary', 'secondary', 'sbicodes'],
    required: true
  },
  {
    id: 5,
    title: 'Geografische dekking',
    description: 'Gebieden waar het bedrijf actief is',
    fields: ['regions', 'national', 'international', 'countries'],
    required: true
  },
  {
    id: 6,
    title: 'Producten / Diensten',
    description: 'Wat het bedrijf aanbiedt',
    fields: ['main', 'description', 'uniqueSellingPoints'],
    required: true
  },
  {
    id: 7,
    title: 'Doelgroep',
    description: 'Wie zijn de klanten',
    fields: ['b2b', 'b2c', 'b2g', 'segments', 'description'],
    required: true
  },
  {
    id: 8,
    title: 'Bedrijfscultuur & Waarden',
    description: 'Kernwaarden en cultuur',
    fields: ['coreValues', 'workEnvironment', 'socialResponsibility'],
    required: true
  },
  {
    id: 9,
    title: 'Groeifase',
    description: 'Huidige fase van het bedrijf',
    fields: ['growthPhase'],
    required: true
  },
  {
    id: 10,
    title: 'Budget voor Aanbestedingen',
    description: 'Financiële capaciteit voor projecten',
    fields: ['min', 'max', 'averageProjectSize'],
    required: true
  },
  {
    id: 11,
    title: 'Ervaring met aanbestedingen',
    description: 'Eerdere ervaring met tenders',
    fields: ['level', 'previousTenders', 'successRate'],
    required: true
  },
  {
    id: 12,
    title: 'Drijfveren voor aanbestedingen',
    description: 'Waarom wilt u aanbestedingen doen',
    fields: ['tenderMotivations'],
    required: true
  },
  {
    id: 13,
    title: 'Soort opdrachten',
    description: 'Type projecten van interesse',
    fields: ['categories', 'preferredDuration', 'contractTypes'],
    required: true
  },
  {
    id: 14,
    title: 'Samenwerkingsvoorkeuren',
    description: 'Hoe wilt u samenwerken',
    fields: ['consortium', 'subcontracting', 'mainContracting', 'preferredPartners'],
    required: true
  },
  {
    id: 15,
    title: 'CPV Codes',
    description: 'Relevante CPV codes voor matching',
    fields: ['primary', 'secondary', 'description'],
    required: true
  }
];