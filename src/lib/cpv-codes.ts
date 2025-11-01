export interface CPVCode {
  code: string;
  description: string;
  level: 'Divisie' | 'Groep' | 'Categorie';
}

export const CPV_CODES: CPVCode[] = [
  { code: '79000000', description: 'Zakelijke diensten: juridische diensten, marketing, consultancy, werving, drukwerk en beveiliging', level: 'Divisie' },
  { code: '45000000', description: 'Bouw- en civiele werken', level: 'Divisie' },
  { code: '72000000', description: 'IT-diensten: consultancy, softwareontwikkeling, internet en ondersteuning', level: 'Divisie' },
  { code: '71000000', description: 'Architectuur-, bouw-, ingenieurs- en inspectiediensten', level: 'Divisie' },
  { code: '90000000', description: 'Riolerings-, afval-, reinigings- en milieudiensten', level: 'Divisie' },
  { code: '77000000', description: 'Landbouw-, bosbouw-, tuinbouw-, aquacultuur- en imkerijdiensten', level: 'Divisie' },
  { code: '34000000', description: 'Transportmiddelen en hulpmiddelen voor transport', level: 'Divisie' },
  { code: '85000000', description: 'Gezondheidszorg- en maatschappelijke dienstverlening', level: 'Divisie' },
  { code: '30000000', description: 'Kantoor- en computerapparatuur en toebehoren', level: 'Divisie' },
  { code: '48000000', description: 'Softwarepakketten en informatiesystemen', level: 'Divisie' },
  { code: '80000000', description: 'Onderwijs- en opleidingsdiensten', level: 'Divisie' },
  { code: '33000000', description: 'Medische apparatuur, farmaceutische producten en persoonlijke verzorgingsproducten', level: 'Divisie' },
  { code: '50000000', description: 'Reparatie- en onderhoudsdiensten', level: 'Divisie' },
  { code: '55000000', description: 'Hotel-, restaurant- en detailhandeldiensten', level: 'Divisie' },
  { code: '64000000', description: 'Post- en telecommunicatiediensten', level: 'Divisie' },
  { code: '92000000', description: 'Recreatieve, culturele en sportdiensten', level: 'Divisie' },
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
  const divisieCode = code.substring(0, 2) + '000000';
  const divisie = CPV_CODES.find(c => c.code === divisieCode && c.level === 'Divisie');
  return divisie?.description || null;
}
