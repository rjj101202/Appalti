import { IKPStep } from '@/types/ikp';

export const IKP_STEPS: IKPStep[] = [
  {
    id: 1,
    title: 'Organisatie',
    description: 'Soort organisatie',
    fields: ['organisationType'],
    required: true,
    score: 15
  },
  {
    id: 2,
    title: 'Besluitvorming in Nederland',
    description: 'Waar wordt de besluitvorming gedaan',
    fields: ['decisionMakingLocation'],
    required: true,
    score: 5
  },
  {
    id: 3,
    title: 'Opdrachtgevers',
    description: 'Type opdrachtgevers (CKV)',
    fields: ['clientTypes'],
    required: true,
    score: 0
  },
  {
    id: 4,
    title: 'Perspectief branche',
    description: 'Branche perspectief (CKV)',
    fields: ['industryPerspective'],
    required: true,
    score: 0
  },
  {
    id: 5,
    title: 'Imago',
    description: 'Imago van de organisatie (CKV)',
    fields: ['organizationImage'],
    required: true,
    score: 0
  },
  {
    id: 6,
    title: 'Regio',
    description: 'Regio waar actief (CKV)',
    fields: ['activeRegions'],
    required: true,
    score: 0
  },
  {
    id: 7,
    title: 'Branche',
    description: 'Branche van de organisatie (CKV)',
    fields: ['industry'],
    required: true,
    score: 0
  },
  {
    id: 8,
    title: 'Aantal medewerkers',
    description: 'Grootte van de organisatie',
    fields: ['employeeCount'],
    required: true,
    score: 5
  },
  {
    id: 9,
    title: 'Matchingselementen',
    description: 'Elementen voor tender matching',
    fields: ['matchingElements'],
    required: true,
    score: 15
  },
  {
    id: 10,
    title: 'Impact',
    description: 'Positie in Kraljic matrix',
    fields: ['kraljicPosition'],
    required: true,
    score: 10
  },
  {
    id: 11,
    title: 'Dienstverlening',
    description: 'Potentieel voor dienstverlening',
    fields: ['servicePotential'],
    required: true,
    score: 15
  },
  {
    id: 12,
    title: 'Issue',
    description: 'Vraagstukken',
    fields: ['issues'],
    required: true,
    score: 20
  },
  {
    id: 13,
    title: 'Financieel',
    description: 'Contractwaarde',
    fields: ['contractValue'],
    required: true,
    score: 10
  },
  {
    id: 14,
    title: 'Samenwerkingsduur',
    description: 'Duur van de samenwerking',
    fields: ['collaborationDuration'],
    required: true,
    score: 5
  },
  {
    id: 15,
    title: 'Kredietwaardigheid',
    description: 'Kredietwaardigheid score (CKV)',
    fields: ['creditworthiness'],
    required: true,
    score: 0
  }
];