/**
 * CPV Code database met Nederlandse omschrijvingen
 * Bron: Europese CPV classificatie + Nederlandse aanbestedingsdata
 */

export interface CPVCode {
  code: string;
  description: string;
  level: 'Divisie' | 'Groep' | 'Categorie';
  usageNotes?: string;
}

export const CPV_CODES: CPVCode[] = [
  // Divisies (hoofdcategorieën) - meest gebruikt
  { code: '79000000', description: 'Zakelijke diensten: juridische diensten, marketing, consultancy, werving, drukwerk en beveiliging', level: 'Divisie' },
  { code: '45000000', description: 'Bouw- en civiele werken', level: 'Divisie' },
  { code: '72000000', description: 'IT-diensten: consultancy, softwareontwikkeling, internet en ondersteuning', level: 'Divisie' },
  { code: '71000000', description: 'Architectuur-, bouw-, ingenieurs- en inspectiediensten', level: 'Divisie' },
  { code: '90000000', description: 'Riolerings-, afval-, reinigings- en milieudiensten', level: 'Divisie' },
  { code: '77000000', description: 'Landbouw-, bosbouw-, tuinbouw-, aquacultuur- en imkerijdiensten', level: 'Divisie' },
  { code: '34000000', description: 'Transportmiddelen en hulpmiddelen voor transport', level: 'Divisie' },
  { code: '85000000', description: 'Gezondheidszorg- en maatschappelijke dienstverlening', level: 'Divisie' },
  { code: '30000000', description: 'Kantoor- en computerapparatuur en toebehoren', level: 'Divisie' },
  { code: '33000000', description: 'Medische apparatuur, farmaceutische producten en persoonlijke verzorgingsproducten', level: 'Divisie' },
  { code: '50000000', description: 'Reparatie- en onderhoudsdiensten', level: 'Divisie' },
  { code: '80000000', description: 'Onderwijs- en opleidingsdiensten', level: 'Divisie' },
  
  // Belangrijke groepen
  { code: '45100000', description: 'Voorbereidende bouwwerkzaamheden', level: 'Groep' },
  { code: '45200000', description: 'Werken voor volledige of gedeeltelijke bouw en civieltechnisch werk', level: 'Groep' },
  { code: '45300000', description: 'Installatiewerkzaamheden in gebouwen', level: 'Groep' },
  { code: '45400000', description: 'Afwerkingswerkzaamheden in gebouwen', level: 'Groep' },
  
  { code: '72100000', description: 'Adviesdiensten voor hardware', level: 'Groep' },
  { code: '72200000', description: 'Softwareprogramma- en adviesdiensten', level: 'Groep' },
  { code: '72300000', description: 'Dataservices', level: 'Groep' },
  { code: '72400000', description: 'Internetdiensten', level: 'Groep' },
  { code: '72500000', description: 'Computergerelateerde diensten', level: 'Groep' },
  
  { code: '71100000', description: 'Architectendiensten', level: 'Groep' },
  { code: '71300000', description: 'Ingenieursdiensten', level: 'Groep' },
  { code: '71400000', description: 'Stedelijke planning en landschapsarchitectuur', level: 'Groep' },
  
  { code: '79100000', description: 'Juridische diensten', level: 'Groep' },
  { code: '79200000', description: 'Accountancy-, audit- en boekhouddiensten', level: 'Groep' },
  { code: '79400000', description: 'Bedrijfs- en managementadviesdiensten en aanverwante diensten', level: 'Groep' },
  { code: '79600000', description: 'Wervingsdiensten', level: 'Groep' },
  
  { code: '85100000', description: 'Gezondheidsdiensten', level: 'Groep' },
  { code: '85300000', description: 'Sociale en aanverwante diensten', level: 'Groep' },
  { code: '85310000', description: 'Sociale diensten', level: 'Categorie' },
  
  { code: '90500000', description: 'Afval- en afvalverwerkingsdiensten', level: 'Groep' },
  { code: '90600000', description: 'Schoonmaak- en sanitatiediensten in stedelijke of landelijke gebieden', level: 'Groep' },
  { code: '90900000', description: 'Schoonmaak- en sanitatiediensten', level: 'Groep' },
  
  { code: '80100000', description: 'Primair onderwijs', level: 'Groep' },
  { code: '80200000', description: 'Secundair onderwijs', level: 'Groep' },
  { code: '80300000', description: 'Hoger onderwijs', level: 'Groep' },
  
  { code: '48000000', description: 'Softwarepakketten en informatiesystemen', level: 'Divisie' },
  { code: '48100000', description: 'Branchegerichte softwarepakketten', level: 'Groep' },
  { code: '48200000', description: 'Netwerk-, internet- en intranetsoftwarepakketten', level: 'Groep' },
  
  { code: '60100000', description: 'Diensten voor vervoer over de weg', level: 'Groep' },
  { code: '60130000', description: 'Passagiersvervoer over de weg met speciaal doel', level: 'Categorie' },
  
  { code: '55000000', description: 'Hotel-, restaurant- en detailhandeldiensten', level: 'Divisie' },
  { code: '55300000', description: 'Restaurant- en voedselservices', level: 'Groep' },
  { code: '55500000', description: 'Kantine- en cateringdiensten', level: 'Groep' },
  
  // Meer divisies
  { code: '3000000', description: 'Agrarische, landbouw-, visserij-, bosbouwproducten en aanverwante producten', level: 'Divisie' },
  { code: '9000000', description: 'Aardolieproducten, brandstoffen, elektriciteit en andere energiebronnen', level: 'Divisie' },
  { code: '14000000', description: 'Delfstoffen, basismetalen en aanverwante producten', level: 'Divisie' },
  { code: '15000000', description: 'Voeding, dranken, tabak en aanverwante producten', level: 'Divisie' },
  { code: '22000000', description: 'Gedrukte materialen en aanverwante producten', level: 'Divisie' },
  { code: '24000000', description: 'Chemische producten', level: 'Divisie' },
  { code: '31000000', description: 'Elektrische machines, apparaten, uitrusting en verbruiksartikelen; verlichting', level: 'Divisie' },
  { code: '32000000', description: 'Radio-, televisie-, communicatie- en telecommunicatieapparatuur en aanverwante uitrusting', level: 'Divisie' },
  { code: '39000000', description: 'Meubilair (inclusief kantoormeubilair), stoffering, huishoudelijke apparaten en schoonmaakproducten', level: 'Divisie' },
  { code: '64000000', description: 'Post- en telecommunicatiediensten', level: 'Divisie' },
  { code: '66000000', description: 'Financiële en verzekeringsdiensten', level: 'Divisie' },
  { code: '70000000', description: 'Vastgoeddiensten', level: 'Divisie' },
  { code: '92000000', description: 'Recreatieve, culturele en sportdiensten', level: 'Divisie' },
];

/**
 * Get CPV code description by code
 */
export function getCPVDescription(code: string): string | null {
  const cpv = CPV_CODES.find(c => c.code === code);
  return cpv?.description || null;
}

/**
 * Get sector from CPV code (first 2 digits = divisie)
 */
export function getSectorFromCPV(code: string): string | null {
  if (!code || code.length < 2) return null;
  
  // Get divisie code (first 2 digits + 6 zeros)
  const divisieCode = code.substring(0, 2) + '000000';
  const divisie = CPV_CODES.find(c => c.code === divisieCode && c.level === 'Divisie');
  
  return divisie?.description || null;
}

/**
 * Search CPV codes by description
 */
export function searchCPVCodes(query: string): CPVCode[] {
  if (!query || query.length < 2) return [];
  
  const lowerQuery = query.toLowerCase();
  return CPV_CODES.filter(cpv => 
    cpv.description.toLowerCase().includes(lowerQuery) ||
    cpv.code.includes(query)
  ).slice(0, 20); // Max 20 results
}

/**
 * Get popular CPV codes (Divisies with high usage)
 */
export function getPopularCPVCodes(): CPVCode[] {
  return CPV_CODES.filter(c => c.level === 'Divisie').slice(0, 15);
}

