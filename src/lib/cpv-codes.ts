export interface CPVCode {
  code: string;
  description: string;
  level: 'Divisie' | 'Groep' | 'Klasse' | 'Categorie';
}

export const CPV_CODES: CPVCode[] = [
  // TenderNed-compatibele CPV codes (Klasse/Categorie niveau)
  // LET OP: TenderNed accepteert GEEN codes eindigend op 0000 (Groep-niveau)!
  // Gebruik codes op Klasse-niveau (eindigt op 00) of Categorie-niveau (8 cijfers)
  
  // Bouw
  { code: '45110000', description: 'Sloopwerkzaamheden', level: 'Klasse' },
  { code: '45111000', description: 'Ontmantelingswerkzaamheden', level: 'Categorie' },
  { code: '45210000', description: 'Gebouwen', level: 'Klasse' },
  { code: '45211000', description: 'Flatgebouwen', level: 'Categorie' },
  { code: '45212000', description: 'Gebouwen voor gebruik in recreatie, ontspanning, sport en cultuur', level: 'Categorie' },
  { code: '45214000', description: 'Bouwwerkzaamheden voor gebouwen met betrekking tot gezondheidszorg', level: 'Categorie' },
  { code: '45220000', description: 'Ingenieurswerken en bouwwerkzaamheden', level: 'Klasse' },
  { code: '45230000', description: 'Wegenbouwwerken', level: 'Klasse' },
  { code: '45231000', description: 'Aanleg van pijpleidingen, communicatielijnen en elektriciteitsleidingen', level: 'Categorie' },
  { code: '45232000', description: 'Nevenwerken voor pijpleidingen en kabels', level: 'Categorie' },
  { code: '45310000', description: 'Aanleg van elektrische bedrading en fittings', level: 'Klasse' },
  { code: '45320000', description: 'Isolatiewerkzaamheden', level: 'Klasse' },
  { code: '45330000', description: 'Loodgieterswerk en sanitaire installaties', level: 'Klasse' },
  { code: '45400000', description: 'Afwerkingswerkzaamheden in gebouwen', level: 'Klasse' },
  
  // IT & Software
  { code: '48110000', description: 'Softwarepakketten voor bedrijfsbeheer', level: 'Klasse' },
  { code: '48210000', description: 'Softwarepakketten voor netwerken', level: 'Klasse' },
  { code: '48211000', description: 'Softwarepakketten voor netwerkontwikkeling', level: 'Categorie' },
  { code: '48212000', description: 'Internetsoftwarepakketten', level: 'Categorie' },
  { code: '48213000', description: 'Platformsoftwarepakketten', level: 'Categorie' },
  { code: '72110000', description: 'Diensten van raadgeving en adviesdiensten inzake hardware', level: 'Klasse' },
  { code: '72210000', description: 'Programmeren van software', level: 'Klasse' },
  { code: '72211000', description: 'Programmeren van systeemssoftware en gebruikerssoftware', level: 'Categorie' },
  { code: '72212000', description: 'Ontwikkelen van applicatiesoftware', level: 'Categorie' },
  { code: '72220000', description: 'Adviesdiensten voor systeemen en techniek', level: 'Klasse' },
  { code: '72230000', description: 'Diensten voor toepassen en implementeren van software', level: 'Klasse' },
  { code: '72240000', description: 'Analyse, programmering en toelevering van systeemen', level: 'Klasse' },
  { code: '72250000', description: 'Onderhoud en ondersteuning van systemen', level: 'Klasse' },
  { code: '72260000', description: 'Diensten voor softwareontwikkeling', level: 'Klasse' },
  { code: '72310000', description: 'Dataverwerking', level: 'Klasse' },
  { code: '72410000', description: 'Diensten van internetproviders', level: 'Klasse' },
  { code: '72510000', description: 'Gegevensbeheer', level: 'Klasse' },
  
  // Zakelijke Diensten
  { code: '79110000', description: 'Diensten van juridisch advies en van juridische vertegenwoordiging', level: 'Klasse' },
  { code: '79111000', description: 'Diensten van juridisch advies', level: 'Categorie' },
  { code: '79120000', description: 'Diensten van octrooien en auteursrechten', level: 'Klasse' },
  { code: '79210000', description: 'Accountancydiensten en -onderzoek', level: 'Klasse' },
  { code: '79211000', description: 'Accountancydiensten', level: 'Categorie' },
  { code: '79212000', description: 'Auditdiensten', level: 'Categorie' },
  { code: '79220000', description: 'Belastingconsulentendiensten', level: 'Klasse' },
  { code: '79410000', description: 'Diensten voor bedrijfs- en managementadvies', level: 'Klasse' },
  { code: '79411000', description: 'Algemene diensten voor bedrijfsadvies', level: 'Categorie' },
  { code: '79412000', description: 'Financieel managementdiensten', level: 'Categorie' },
  { code: '79413000', description: 'Marketingmanagement', level: 'Categorie' },
  { code: '79414000', description: 'Managementdiensten voor human resources', level: 'Categorie' },
  { code: '79415000', description: 'Diensten van strategisch advies', level: 'Categorie' },
  { code: '79416000', description: 'Diensten van public-relationsadvies', level: 'Categorie' },
  { code: '79421000', description: 'Projectmanagement anders dan voor bouwwerkzaamheden', level: 'Categorie' },
  { code: '79610000', description: 'Wervingsdiensten', level: 'Klasse' },
  { code: '79611000', description: 'Diensten van arbeidsbemiddeling', level: 'Categorie' },
  { code: '79710000', description: 'Beveiligingsdiensten', level: 'Klasse' },
  { code: '79711000', description: 'Alarmcontrole- en bewakingsdiensten', level: 'Categorie' },
  
  // Architectuur & Ingenieurs
  { code: '71110000', description: 'Raadgevende diensten op het gebied van architectuur', level: 'Klasse' },
  { code: '71200000', description: 'Diensten van architecten op het gebied van bouw', level: 'Klasse' },
  { code: '71220000', description: 'Architectonisch ontwerp', level: 'Klasse' },
  { code: '71310000', description: 'Raadgevende diensten op het gebied van ingenieurskunde', level: 'Klasse' },
  { code: '71311000', description: 'Diensten van raadgeving op het gebied van civieltechniek', level: 'Categorie' },
  { code: '71320000', description: 'Diensten van ingenieursontwerp', level: 'Klasse' },
  { code: '71330000', description: 'Diverse diensten van ingenieurskunde', level: 'Klasse' },
  { code: '71410000', description: 'Landschapsarchitectuurdiensten', level: 'Klasse' },
  
  // Zorg & Sociaal
  { code: '85110000', description: 'Ziekenhuisdiensten en aanverwante diensten', level: 'Klasse' },
  { code: '85111000', description: 'Intensive-carediensten', level: 'Categorie' },
  { code: '85120000', description: 'Medische diensten', level: 'Klasse' },
  { code: '85121000', description: 'Algemene medische diensten', level: 'Categorie' },
  { code: '85140000', description: 'Diverse diensten van gezondheidszorg', level: 'Klasse' },
  { code: '85310000', description: 'Maatschappelijk dienstverlening', level: 'Klasse' },
  { code: '85311000', description: 'Diensten van sociale begeleiding', level: 'Categorie' },
  { code: '85312000', description: 'Thuiszorgdiensten', level: 'Categorie' },
  
  // Milieu & Afval
  { code: '90510000', description: 'Verwijdering en verwerking van afval', level: 'Klasse' },
  { code: '90511000', description: 'Inzameling van afval', level: 'Categorie' },
  { code: '90512000', description: 'Vervoer van afval', level: 'Categorie' },
  { code: '90513000', description: 'Behandeling en verwijdering van ongevaarlijk afval', level: 'Categorie' },
  { code: '90610000', description: 'Diensten voor straatreiniging', level: 'Klasse' },
  { code: '90620000', description: 'Diensten voor sneeuwruiming', level: 'Klasse' },
  { code: '90910000', description: 'Reinigingsdiensten', level: 'Klasse' },
  { code: '90911000', description: 'Schoonmaken van woningen, gebouwen en ramen', level: 'Categorie' },
  { code: '90920000', description: 'Ontstoppingsdiensten', level: 'Klasse' },
  
  // Onderwijs
  { code: '80110000', description: 'Diensten op het gebied van voorschools onderwijs', level: 'Klasse' },
  { code: '80210000', description: 'Diensten op het gebied van middelbaar onderwijs', level: 'Klasse' },
  { code: '80310000', description: 'Diensten op het gebied van hoger onderwijs', level: 'Klasse' },
  { code: '80411000', description: 'Diensten op het gebied van middelbaar beroepsonderwijs', level: 'Categorie' },
  { code: '80500000', description: 'Trainingsdiensten', level: 'Klasse' },
  { code: '80510000', description: 'Gespecialiseerde trainingsdiensten', level: 'Klasse' },
  { code: '80530000', description: 'Beroepsopleidingsdiensten', level: 'Klasse' },
  
  // Transport
  { code: '60110000', description: 'Openbaar vervoer over de weg', level: 'Klasse' },
  { code: '60112000', description: 'Openbaar vervoer per bus', level: 'Categorie' },
  { code: '60130000', description: 'Diensten van speciaal vervoer van personen over de weg', level: 'Klasse' },
  { code: '60140000', description: 'Niet-geregeld passagiersvervoer', level: 'Klasse' },
  
  // Horeca & Catering
  { code: '55310000', description: 'Restaurantdiensten', level: 'Klasse' },
  { code: '55320000', description: 'Kantine en cateringdiensten', level: 'Klasse' },
  { code: '55321000', description: 'Maaltijddiensten', level: 'Categorie' },
  { code: '55510000', description: 'Kantinediensten', level: 'Klasse' },
  { code: '55520000', description: 'Cateringdiensten', level: 'Klasse' },
  { code: '55521000', description: 'Maaltijdbereidingsdiensten', level: 'Categorie' },
  
  // Landbouw & Tuin
  { code: '77110000', description: 'Landbouwdiensten', level: 'Klasse' },
  { code: '77111000', description: 'Graanoogstdiensten', level: 'Categorie' },
  { code: '77120000', description: 'Tuinbouwdiensten', level: 'Klasse' },
  { code: '77210000', description: 'Bosbouwdiensten', level: 'Klasse' },
  { code: '77211000', description: 'Diensten van bosplant en houtkapbedrijven', level: 'Categorie' },
  { code: '77310000', description: 'Aanplanten en onderhouden van groengebieden', level: 'Klasse' },
  { code: '77311000', description: 'Aanplanten en onderhouden van parken en tuinen', level: 'Categorie' },
  { code: '77312000', description: 'Aanplanten en onderhouden van sportvelden', level: 'Categorie' },
  { code: '77314000', description: 'Onderhoud van groengebieden', level: 'Categorie' },
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
