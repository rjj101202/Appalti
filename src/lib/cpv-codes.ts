export interface CPVCode {
  code: string;
  description: string;
  level: 'Divisie' | 'Groep' | 'Categorie';
}

export const CPV_CODES: CPVCode[] = [
  // Groep-level codes (werken WEL met TenderNed API)
  // Divisie codes (xxxxxx00) worden NIET geaccepteerd door TenderNed!
  
  // Bouw
  { code: '45100000', description: 'Voorbereidende bouwwerkzaamheden', level: 'Groep' },
  { code: '45200000', description: 'Werken voor volledige of gedeeltelijke bouw en civieltechnisch werk', level: 'Groep' },
  { code: '45300000', description: 'Installatiewerkzaamheden in gebouwen', level: 'Groep' },
  { code: '45400000', description: 'Afwerkingswerkzaamheden in gebouwen', level: 'Groep' },
  
  // IT
  { code: '72100000', description: 'Adviesdiensten voor hardware', level: 'Groep' },
  { code: '72200000', description: 'Softwareprogramma- en adviesdiensten', level: 'Groep' },
  { code: '72300000', description: 'Dataservices', level: 'Groep' },
  { code: '72400000', description: 'Internetdiensten', level: 'Groep' },
  { code: '72500000', description: 'Computergerelateerde diensten', level: 'Groep' },
  { code: '48100000', description: 'Branchegerichte softwarepakketten', level: 'Groep' },
  { code: '48200000', description: 'Netwerk-, internet- en intranetsoftwarepakketten', level: 'Groep' },
  
  // Zakelijke diensten
  { code: '79100000', description: 'Juridische diensten', level: 'Groep' },
  { code: '79200000', description: 'Accountancy-, audit- en boekhouddiensten', level: 'Groep' },
  { code: '79400000', description: 'Bedrijfs- en managementadviesdiensten', level: 'Groep' },
  { code: '79600000', description: 'Wervingsdiensten', level: 'Groep' },
  { code: '79700000', description: 'Opsporings- en beveiligingsdiensten', level: 'Groep' },
  
  // Architectuur & Ingenieurs
  { code: '71100000', description: 'Architectendiensten', level: 'Groep' },
  { code: '71300000', description: 'Ingenieursdiensten', level: 'Groep' },
  { code: '71400000', description: 'Stedelijke planning en landschapsarchitectuur', level: 'Groep' },
  
  // Zorg & Sociaal
  { code: '85100000', description: 'Gezondheidsdiensten', level: 'Groep' },
  { code: '85300000', description: 'Sociale en aanverwante diensten', level: 'Groep' },
  { code: '85310000', description: 'Sociale diensten', level: 'Categorie' },
  
  // Milieu
  { code: '90500000', description: 'Afval- en afvalverwerkingsdiensten', level: 'Groep' },
  { code: '90600000', description: 'Schoonmaak- en sanitatiediensten in stedelijke of landelijke gebieden', level: 'Groep' },
  { code: '90900000', description: 'Schoonmaak- en sanitatiediensten', level: 'Groep' },
  
  // Onderwijs
  { code: '80100000', description: 'Primair onderwijs', level: 'Groep' },
  { code: '80200000', description: 'Secundair onderwijs', level: 'Groep' },
  { code: '80300000', description: 'Hoger onderwijs', level: 'Groep' },
  { code: '80400000', description: 'Volwasseneneducatie', level: 'Groep' },
  
  // Transport
  { code: '60100000', description: 'Diensten voor vervoer over de weg', level: 'Groep' },
  { code: '60130000', description: 'Passagiersvervoer over de weg met speciaal doel', level: 'Categorie' },
  
  // Catering
  { code: '55300000', description: 'Restaurant- en voedselservices', level: 'Groep' },
  { code: '55500000', description: 'Kantine- en cateringdiensten', level: 'Groep' },
  
  // Landbouw
  { code: '77100000', description: 'Landbouw- en bosdiensten', level: 'Groep' },
  { code: '77200000', description: 'Bosbouwdiensten', level: 'Groep' },
  { code: '77300000', description: 'Tuinbouwdiensten', level: 'Groep' },
];

export function searchCPVCodes(query: string): CPVCode[] {
  if (!query || query.length < 2) return [];
  const lowerQuery = query.toLowerCase();
  return CPV_CODES.filter(cpv => 
    cpv.description.toLowerCase().includes(lowerQuery) || cpv.code.includes(query)
  ).slice(0, 20);
}

export function getSectorFromCPV(code: string): string | null {
  if (!code || code.length < 2) return null;
  
  // Map CPV code to sector based on first 2 digits
  const prefix = code.substring(0, 2);
  const sectorMap: Record<string, string> = {
    '45': 'Bouw & Civiel',
    '71': 'Architectuur & Ingenieurs',
    '72': 'IT-diensten',
    '48': 'Software',
    '79': 'Zakelijke Diensten',
    '85': 'Zorg & Sociaal',
    '90': 'Milieu & Afval',
    '80': 'Onderwijs',
    '60': 'Transport',
    '55': 'Horeca & Catering',
    '77': 'Landbouw',
    '30': 'Kantoorapparatuur',
    '33': 'Medische Apparatuur',
    '50': 'Onderhoud & Reparatie',
  };
  
  return sectorMap[prefix] || null;
}
