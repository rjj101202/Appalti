import { IKPStep } from '@/types/ikp';

export const IKP_STEPS: IKPStep[] = [
  {
    id: 1,
    title: 'Geografische scope',
    description: 'In welke provincies is de organisatie actief?',
    fields: ['geographicScope'],
    required: true,
    scoreType: 'CKV',
    score: 0
  },
  {
    id: 2,
    title: 'Omvang in aantal werkzame personen',
    description: 'Hoeveel medewerkers heeft de organisatie?',
    fields: ['employeeCount'],
    required: true,
    scoreType: 'CKV',
    score: 0
  },
  {
    id: 3,
    title: 'Opdrachtgevers',
    description: 'Voor welk type opdrachtgevers werkt de organisatie?',
    fields: ['clientTypes'],
    required: true,
    scoreType: 'CKV',
    score: 0
  },
  {
    id: 4,
    title: 'Branche',
    description: 'In welke branche(s) is de organisatie actief?',
    fields: ['industry'],
    required: true,
    scoreType: 'CKV',
    score: 0
  },
  {
    id: 5,
    title: 'Opdrachtgever DNA/matchingselementen',
    description: 'Wat zijn de belangrijkste matchingselementen voor deze organisatie?',
    fields: ['clientDNA'],
    required: true,
    scoreType: 'percentage',
    score: 15
  },
  {
    id: 6,
    title: 'Concurrentie - Soort',
    description: 'Wat voor soort concurrentie heeft de organisatie?',
    fields: ['competitionType'],
    required: true,
    scoreType: 'percentage',
    score: 4
  },
  {
    id: 7,
    title: 'Concurrentie - Aantal',
    description: 'Hoeveel concurrenten zijn er actief in deze markt?',
    fields: ['competitionCount'],
    required: true,
    scoreType: 'percentage',
    score: 4
  },
  {
    id: 8,
    title: 'Impact - Positie in Kraljic matrix',
    description: 'Wat is de positie in de Kraljic matrix?',
    fields: ['kraljicPosition'],
    required: true,
    scoreType: 'percentage',
    score: 10
  },
  {
    id: 9,
    title: 'Dienstverlening - Potentiële dienstverlening',
    description: 'Welke diensten kan de organisatie potentieel leveren?',
    fields: ['potentialServices'],
    required: true,
    scoreType: 'percentage',
    score: 15
  },
  {
    id: 10,
    title: 'Dienstverlening - Potentieel voor additionele dienstverlening',
    description: 'Welke additionele diensten kunnen worden aangeboden?',
    fields: ['additionalServices'],
    required: true,
    scoreType: 'percentage',
    score: 2
  },
  {
    id: 11,
    title: 'Issue - Vraagstukken',
    description: 'Welke vraagstukken spelen er bij deze organisatie?',
    fields: ['issues'],
    required: true,
    scoreType: 'percentage',
    score: 20
  },
  {
    id: 12,
    title: 'Financieel - Potentieel contractwaarde',
    description: 'Wat is de potentiële contractwaarde?',
    fields: ['contractValue'],
    required: true,
    scoreType: 'percentage',
    score: 10
  },
  {
    id: 13,
    title: 'Financieel - Brutomarge',
    description: 'Wat is de verwachte brutomarge?',
    fields: ['grossMargin'],
    required: true,
    scoreType: 'percentage',
    score: 10
  },
  {
    id: 14,
    title: 'Samenwerkingsduur',
    description: 'Wat is de verwachte duur van de samenwerking?',
    fields: ['collaborationDuration'],
    required: true,
    scoreType: 'percentage',
    score: 10
  },
  {
    id: 15,
    title: 'Kredietwaardigheid',
    description: 'Wat is de kredietwaardigheid van de organisatie?',
    fields: ['creditworthiness'],
    required: true,
    scoreType: 'CKV',
    score: 0
  }
];