/**
 * CPV Codes - Top Codes voor UI Autocomplete
 * 
 * Dit is een subset van 9454 codes, alleen de meest gebruikte
 * Voor volledige lijst zie MongoDB of cpv-codes-complete.ts
 */

export interface CPVCode {
  code: string;
  coreCode: string;
  checkDigit: number;
  description: string;
  level: 'Divisie' | 'Groep' | 'Klasse' | 'Categorie';
  tenderNedCompatible: boolean;
}

export const CPV_CODES_TOP: CPVCode[] = [
  {
    "code": "45111000-8",
    "coreCode": "45111000",
    "checkDigit": 8,
    "description": "Sloopwerkzaamheden, bouwrijp maken en ruimen van bouwterreinen",
    "level": "Klasse",
    "tenderNedCompatible": true
  },
  {
    "code": "45111100-9",
    "coreCode": "45111100",
    "checkDigit": 9,
    "description": "Sloopwerkzaamheden",
    "level": "Klasse",
    "tenderNedCompatible": true
  },
  {
    "code": "45111200-0",
    "coreCode": "45111200",
    "checkDigit": 0,
    "description": "Bouwrijp maken en ruimen van bouwterreinen",
    "level": "Klasse",
    "tenderNedCompatible": true
  },
  {
    "code": "45111210-3",
    "coreCode": "45111210",
    "checkDigit": 3,
    "description": "Steenvrij maken door middel van explosieven en dergelijke",
    "level": "Categorie",
    "tenderNedCompatible": true
  },
  {
    "code": "45111211-0",
    "coreCode": "45111211",
    "checkDigit": 0,
    "description": "Explosiewerkzaamheden",
    "level": "Categorie",
    "tenderNedCompatible": true
  },
  {
    "code": "45111212-7",
    "coreCode": "45111212",
    "checkDigit": 7,
    "description": "Steenvrij maken",
    "level": "Categorie",
    "tenderNedCompatible": true
  },
  {
    "code": "45111213-4",
    "coreCode": "45111213",
    "checkDigit": 4,
    "description": "Ruimen van bouwterreinen",
    "level": "Categorie",
    "tenderNedCompatible": true
  },
  {
    "code": "45111214-1",
    "coreCode": "45111214",
    "checkDigit": 1,
    "description": "Ruimen door explosie",
    "level": "Categorie",
    "tenderNedCompatible": true
  },
  {
    "code": "45111220-6",
    "coreCode": "45111220",
    "checkDigit": 6,
    "description": "Verwijderen van begroeiing op bouwterreinen",
    "level": "Categorie",
    "tenderNedCompatible": true
  },
  {
    "code": "45111230-9",
    "coreCode": "45111230",
    "checkDigit": 9,
    "description": "Grondstabilisatie",
    "level": "Categorie",
    "tenderNedCompatible": true
  },
  {
    "code": "45111240-2",
    "coreCode": "45111240",
    "checkDigit": 2,
    "description": "Gronddrainage",
    "level": "Categorie",
    "tenderNedCompatible": true
  },
  {
    "code": "45111250-5",
    "coreCode": "45111250",
    "checkDigit": 5,
    "description": "Uitvoering van bodemonderzoek",
    "level": "Categorie",
    "tenderNedCompatible": true
  },
  {
    "code": "45111260-8",
    "coreCode": "45111260",
    "checkDigit": 8,
    "description": "Terreinvoorbereiding voor mijnbouw",
    "level": "Categorie",
    "tenderNedCompatible": true
  },
  {
    "code": "45111290-7",
    "coreCode": "45111290",
    "checkDigit": 7,
    "description": "Voorbereidende werkzaamheden voor leidingen",
    "level": "Categorie",
    "tenderNedCompatible": true
  },
  {
    "code": "45111291-4",
    "coreCode": "45111291",
    "checkDigit": 4,
    "description": "Inrichten van de bouwplaats",
    "level": "Categorie",
    "tenderNedCompatible": true
  },
  {
    "code": "71221000-3",
    "coreCode": "71221000",
    "checkDigit": 3,
    "description": "Diensten door architectenbureaus voor gebouwen",
    "level": "Klasse",
    "tenderNedCompatible": true
  },
  {
    "code": "71222000-0",
    "coreCode": "71222000",
    "checkDigit": 0,
    "description": "Diensten door architectenbureaus voor buitenvoorzieningen",
    "level": "Klasse",
    "tenderNedCompatible": true
  },
  {
    "code": "71222100-1",
    "coreCode": "71222100",
    "checkDigit": 1,
    "description": "Karteringsdiensten voor stedelijke gebieden",
    "level": "Klasse",
    "tenderNedCompatible": true
  },
  {
    "code": "71222200-2",
    "coreCode": "71222200",
    "checkDigit": 2,
    "description": "Karteringsdiensten voor plattelandsgebieden",
    "level": "Klasse",
    "tenderNedCompatible": true
  },
  {
    "code": "71223000-7",
    "coreCode": "71223000",
    "checkDigit": 7,
    "description": "Diensten door architectenbureaus voor uitbreidingsverbouwingen",
    "level": "Klasse",
    "tenderNedCompatible": true
  },
  {
    "code": "71241000-9",
    "coreCode": "71241000",
    "checkDigit": 9,
    "description": "Haalbaarheidsstudie, adviesverlening, analyse",
    "level": "Klasse",
    "tenderNedCompatible": true
  },
  {
    "code": "71242000-6",
    "coreCode": "71242000",
    "checkDigit": 6,
    "description": "Project- en ontwerpvoorbereiding, kostenraming",
    "level": "Klasse",
    "tenderNedCompatible": true
  },
  {
    "code": "71243000-3",
    "coreCode": "71243000",
    "checkDigit": 3,
    "description": "Ontwerpplannen (systemen en integratie)",
    "level": "Klasse",
    "tenderNedCompatible": true
  },
  {
    "code": "71244000-0",
    "coreCode": "71244000",
    "checkDigit": 0,
    "description": "Kostenberekening en -bewaking",
    "level": "Klasse",
    "tenderNedCompatible": true
  },
  {
    "code": "71245000-7",
    "coreCode": "71245000",
    "checkDigit": 7,
    "description": "Plannen ter goedkeuring, werktekeningen en specificaties",
    "level": "Klasse",
    "tenderNedCompatible": true
  },
  {
    "code": "71246000-4",
    "coreCode": "71246000",
    "checkDigit": 4,
    "description": "Bepalen en opsommen van hoeveelheden in de bouw",
    "level": "Klasse",
    "tenderNedCompatible": true
  },
  {
    "code": "71247000-1",
    "coreCode": "71247000",
    "checkDigit": 1,
    "description": "Toezicht op bouwwerkzaamheden",
    "level": "Klasse",
    "tenderNedCompatible": true
  },
  {
    "code": "71248000-8",
    "coreCode": "71248000",
    "checkDigit": 8,
    "description": "Toezicht op plannen en documentatie",
    "level": "Klasse",
    "tenderNedCompatible": true
  },
  {
    "code": "71251000-2",
    "coreCode": "71251000",
    "checkDigit": 2,
    "description": "Architecten- en bouwinspectiediensten",
    "level": "Klasse",
    "tenderNedCompatible": true
  },
  {
    "code": "71311000-1",
    "coreCode": "71311000",
    "checkDigit": 1,
    "description": "Adviezen inzake bouwkunde",
    "level": "Klasse",
    "tenderNedCompatible": true
  },
  {
    "code": "72211000-7",
    "coreCode": "72211000",
    "checkDigit": 7,
    "description": "Programmering van systeem- en gebruikerssoftware",
    "level": "Klasse",
    "tenderNedCompatible": true
  },
  {
    "code": "72212000-4",
    "coreCode": "72212000",
    "checkDigit": 4,
    "description": "Programmering van toepassingssoftware",
    "level": "Klasse",
    "tenderNedCompatible": true
  },
  {
    "code": "72212100-0",
    "coreCode": "72212100",
    "checkDigit": 0,
    "description": "Diensten voor ontwikkeling van speciale software voor de industrie",
    "level": "Klasse",
    "tenderNedCompatible": true
  },
  {
    "code": "72212110-3",
    "coreCode": "72212110",
    "checkDigit": 3,
    "description": "Diensten voor ontwikkeling van software voor verkooppunten",
    "level": "Categorie",
    "tenderNedCompatible": true
  },
  {
    "code": "72212120-6",
    "coreCode": "72212120",
    "checkDigit": 6,
    "description": "Diensten voor ontwikkeling van software voor vluchtbesturing",
    "level": "Categorie",
    "tenderNedCompatible": true
  },
  {
    "code": "72212121-3",
    "coreCode": "72212121",
    "checkDigit": 3,
    "description": "Diensten voor ontwikkeling van software voor luchtverkeersleiding",
    "level": "Categorie",
    "tenderNedCompatible": true
  },
  {
    "code": "72212130-9",
    "coreCode": "72212130",
    "checkDigit": 9,
    "description": "Diensten voor ontwikkeling van software voor grondondersteuning in de luchtvaart en testsoftware",
    "level": "Categorie",
    "tenderNedCompatible": true
  },
  {
    "code": "72212131-6",
    "coreCode": "72212131",
    "checkDigit": 6,
    "description": "Diensten voor ontwikkeling van software voor grondondersteuning in de luchtvaart",
    "level": "Categorie",
    "tenderNedCompatible": true
  },
  {
    "code": "72212132-3",
    "coreCode": "72212132",
    "checkDigit": 3,
    "description": "Diensten voor ontwikkeling van testsoftware voor de luchtvaart",
    "level": "Categorie",
    "tenderNedCompatible": true
  },
  {
    "code": "72212140-2",
    "coreCode": "72212140",
    "checkDigit": 2,
    "description": "Diensten voor ontwikkeling van software voor spoorwegverkeersleiding",
    "level": "Categorie",
    "tenderNedCompatible": true
  },
  {
    "code": "72212150-5",
    "coreCode": "72212150",
    "checkDigit": 5,
    "description": "Diensten voor ontwikkeling van software voor industriële controle",
    "level": "Categorie",
    "tenderNedCompatible": true
  },
  {
    "code": "72212160-8",
    "coreCode": "72212160",
    "checkDigit": 8,
    "description": "Diensten voor ontwikkeling van bibliotheeksoftware",
    "level": "Categorie",
    "tenderNedCompatible": true
  },
  {
    "code": "72212170-1",
    "coreCode": "72212170",
    "checkDigit": 1,
    "description": "Diensten voor ontwikkeling van conformiteitssoftware",
    "level": "Categorie",
    "tenderNedCompatible": true
  },
  {
    "code": "72212180-4",
    "coreCode": "72212180",
    "checkDigit": 4,
    "description": "Diensten voor ontwikkeling van medische software",
    "level": "Categorie",
    "tenderNedCompatible": true
  },
  {
    "code": "72212190-7",
    "coreCode": "72212190",
    "checkDigit": 7,
    "description": "Diensten voor ontwikkeling van onderwijssoftware",
    "level": "Categorie",
    "tenderNedCompatible": true
  },
  {
    "code": "77111000-1",
    "coreCode": "77111000",
    "checkDigit": 1,
    "description": "Verhuur van landbouwmachines met bedieningspersoneel",
    "level": "Klasse",
    "tenderNedCompatible": true
  },
  {
    "code": "77112000-8",
    "coreCode": "77112000",
    "checkDigit": 8,
    "description": "Verhuur van maaimachines of landbouwmaterieel met bedieningspersoneel",
    "level": "Klasse",
    "tenderNedCompatible": true
  },
  {
    "code": "77211000-2",
    "coreCode": "77211000",
    "checkDigit": 2,
    "description": "Diensten in verband met houtwinning",
    "level": "Klasse",
    "tenderNedCompatible": true
  },
  {
    "code": "77211100-3",
    "coreCode": "77211100",
    "checkDigit": 3,
    "description": "Houtvestersdiensten",
    "level": "Klasse",
    "tenderNedCompatible": true
  },
  {
    "code": "77211200-4",
    "coreCode": "77211200",
    "checkDigit": 4,
    "description": "Vervoer van stukken boomstam in het bos",
    "level": "Klasse",
    "tenderNedCompatible": true
  },
  {
    "code": "77211300-5",
    "coreCode": "77211300",
    "checkDigit": 5,
    "description": "Rooien van bomen",
    "level": "Klasse",
    "tenderNedCompatible": true
  },
  {
    "code": "77211400-6",
    "coreCode": "77211400",
    "checkDigit": 6,
    "description": "Vellen van bomen",
    "level": "Klasse",
    "tenderNedCompatible": true
  },
  {
    "code": "77211500-7",
    "coreCode": "77211500",
    "checkDigit": 7,
    "description": "Onderhouden van bomen",
    "level": "Klasse",
    "tenderNedCompatible": true
  },
  {
    "code": "77211600-8",
    "coreCode": "77211600",
    "checkDigit": 8,
    "description": "Zaaien van bomen",
    "level": "Klasse",
    "tenderNedCompatible": true
  },
  {
    "code": "77231000-8",
    "coreCode": "77231000",
    "checkDigit": 8,
    "description": "Diensten voor bosbouwbeheer",
    "level": "Klasse",
    "tenderNedCompatible": true
  },
  {
    "code": "77231100-9",
    "coreCode": "77231100",
    "checkDigit": 9,
    "description": "Beheersdiensten van bosbestanden",
    "level": "Klasse",
    "tenderNedCompatible": true
  },
  {
    "code": "77231200-0",
    "coreCode": "77231200",
    "checkDigit": 0,
    "description": "Diensten voor ongediertebestrijding in bossen",
    "level": "Klasse",
    "tenderNedCompatible": true
  },
  {
    "code": "77231300-1",
    "coreCode": "77231300",
    "checkDigit": 1,
    "description": "Bosbeheersdiensten",
    "level": "Klasse",
    "tenderNedCompatible": true
  },
  {
    "code": "77231400-2",
    "coreCode": "77231400",
    "checkDigit": 2,
    "description": "Bosinventarisatiediensten",
    "level": "Klasse",
    "tenderNedCompatible": true
  },
  {
    "code": "77231500-3",
    "coreCode": "77231500",
    "checkDigit": 3,
    "description": "Diensten voor bosmonitoring en -beoordeling",
    "level": "Klasse",
    "tenderNedCompatible": true
  },
  {
    "code": "79111000-5",
    "coreCode": "79111000",
    "checkDigit": 5,
    "description": "Juridisch advies",
    "level": "Klasse",
    "tenderNedCompatible": true
  },
  {
    "code": "79112000-2",
    "coreCode": "79112000",
    "checkDigit": 2,
    "description": "Juridische vertegenwoordiging",
    "level": "Klasse",
    "tenderNedCompatible": true
  },
  {
    "code": "79112100-3",
    "coreCode": "79112100",
    "checkDigit": 3,
    "description": "Vertegenwoordigingsdiensten voor belanghebbenden",
    "level": "Klasse",
    "tenderNedCompatible": true
  },
  {
    "code": "79121000-8",
    "coreCode": "79121000",
    "checkDigit": 8,
    "description": "Adviezen inzake auteursrechten",
    "level": "Klasse",
    "tenderNedCompatible": true
  },
  {
    "code": "79121100-9",
    "coreCode": "79121100",
    "checkDigit": 9,
    "description": "Adviezen inzake auteursrechten voor software",
    "level": "Klasse",
    "tenderNedCompatible": true
  },
  {
    "code": "79131000-1",
    "coreCode": "79131000",
    "checkDigit": 1,
    "description": "Documentatiedienstverlening",
    "level": "Klasse",
    "tenderNedCompatible": true
  },
  {
    "code": "79132000-8",
    "coreCode": "79132000",
    "checkDigit": 8,
    "description": "Certificeringsdienstverlening",
    "level": "Klasse",
    "tenderNedCompatible": true
  },
  {
    "code": "79132100-9",
    "coreCode": "79132100",
    "checkDigit": 9,
    "description": "Certificatiedienst voor elektronische handtekeningen",
    "level": "Klasse",
    "tenderNedCompatible": true
  },
  {
    "code": "79211000-6",
    "coreCode": "79211000",
    "checkDigit": 6,
    "description": "Boekhoudingsdiensten",
    "level": "Klasse",
    "tenderNedCompatible": true
  },
  {
    "code": "79211100-7",
    "coreCode": "79211100",
    "checkDigit": 7,
    "description": "Boekhouddiensten",
    "level": "Klasse",
    "tenderNedCompatible": true
  },
  {
    "code": "79211110-0",
    "coreCode": "79211110",
    "checkDigit": 0,
    "description": "Loonadministratiediensten",
    "level": "Categorie",
    "tenderNedCompatible": true
  },
  {
    "code": "79211120-3",
    "coreCode": "79211120",
    "checkDigit": 3,
    "description": "Registratie van aan- en verkoop",
    "level": "Categorie",
    "tenderNedCompatible": true
  },
  {
    "code": "79211200-8",
    "coreCode": "79211200",
    "checkDigit": 8,
    "description": "Opstellen van financiële verslagen",
    "level": "Klasse",
    "tenderNedCompatible": true
  },
  {
    "code": "79212000-3",
    "coreCode": "79212000",
    "checkDigit": 3,
    "description": "Auditdiensten",
    "level": "Klasse",
    "tenderNedCompatible": true
  },
  {
    "code": "79212100-4",
    "coreCode": "79212100",
    "checkDigit": 4,
    "description": "Uitvoeren van financiële audit",
    "level": "Klasse",
    "tenderNedCompatible": true
  },
  {
    "code": "85111000-0",
    "coreCode": "85111000",
    "checkDigit": 0,
    "description": "Ziekenhuisdiensten",
    "level": "Klasse",
    "tenderNedCompatible": true
  },
  {
    "code": "85111100-1",
    "coreCode": "85111100",
    "checkDigit": 1,
    "description": "Chirurgische ziekenhuisdiensten",
    "level": "Klasse",
    "tenderNedCompatible": true
  },
  {
    "code": "85111200-2",
    "coreCode": "85111200",
    "checkDigit": 2,
    "description": "Medische ziekenhuisdiensten",
    "level": "Klasse",
    "tenderNedCompatible": true
  },
  {
    "code": "85111300-3",
    "coreCode": "85111300",
    "checkDigit": 3,
    "description": "Gynaecologische ziekenhuisdiensten",
    "level": "Klasse",
    "tenderNedCompatible": true
  },
  {
    "code": "85111310-6",
    "coreCode": "85111310",
    "checkDigit": 6,
    "description": "Diensten voor in-vitrofertilisatie",
    "level": "Categorie",
    "tenderNedCompatible": true
  },
  {
    "code": "85111320-9",
    "coreCode": "85111320",
    "checkDigit": 9,
    "description": "Verloskundige ziekenhuisdiensten",
    "level": "Categorie",
    "tenderNedCompatible": true
  },
  {
    "code": "85111400-4",
    "coreCode": "85111400",
    "checkDigit": 4,
    "description": "Ziekenhuisdiensten voor revalidatie",
    "level": "Klasse",
    "tenderNedCompatible": true
  },
  {
    "code": "85111500-5",
    "coreCode": "85111500",
    "checkDigit": 5,
    "description": "Psychiatrische ziekenhuisdiensten",
    "level": "Klasse",
    "tenderNedCompatible": true
  },
  {
    "code": "85111600-6",
    "coreCode": "85111600",
    "checkDigit": 6,
    "description": "Orthopedische diensten",
    "level": "Klasse",
    "tenderNedCompatible": true
  },
  {
    "code": "85111700-7",
    "coreCode": "85111700",
    "checkDigit": 7,
    "description": "Diensten voor zuurstoftherapie",
    "level": "Klasse",
    "tenderNedCompatible": true
  },
  {
    "code": "85111800-8",
    "coreCode": "85111800",
    "checkDigit": 8,
    "description": "Pathologiediensten",
    "level": "Klasse",
    "tenderNedCompatible": true
  },
  {
    "code": "85111810-1",
    "coreCode": "85111810",
    "checkDigit": 1,
    "description": "Bloedanalysediensten",
    "level": "Categorie",
    "tenderNedCompatible": true
  },
  {
    "code": "85111820-4",
    "coreCode": "85111820",
    "checkDigit": 4,
    "description": "Bacteriologische analysediensten",
    "level": "Categorie",
    "tenderNedCompatible": true
  },
  {
    "code": "85111900-9",
    "coreCode": "85111900",
    "checkDigit": 9,
    "description": "Dialysediensten in ziekenhuis",
    "level": "Klasse",
    "tenderNedCompatible": true
  },
  {
    "code": "85112000-7",
    "coreCode": "85112000",
    "checkDigit": 7,
    "description": "Ondersteuningsdiensten voor ziekenhuis",
    "level": "Klasse",
    "tenderNedCompatible": true
  },
  {
    "code": "90481000-2",
    "coreCode": "90481000",
    "checkDigit": 2,
    "description": "Exploitatie van een afvalwaterzuiveringsinstallatie",
    "level": "Klasse",
    "tenderNedCompatible": true
  },
  {
    "code": "90491000-5",
    "coreCode": "90491000",
    "checkDigit": 5,
    "description": "Rioolonderzoeksdiensten",
    "level": "Klasse",
    "tenderNedCompatible": true
  },
  {
    "code": "90492000-2",
    "coreCode": "90492000",
    "checkDigit": 2,
    "description": "Advies inzake afvalwaterbehandeling",
    "level": "Klasse",
    "tenderNedCompatible": true
  },
  {
    "code": "90511000-2",
    "coreCode": "90511000",
    "checkDigit": 2,
    "description": "Diensten voor ophalen van vuilnis",
    "level": "Klasse",
    "tenderNedCompatible": true
  },
  {
    "code": "90511100-3",
    "coreCode": "90511100",
    "checkDigit": 3,
    "description": "Ophalen van vast stadsafval",
    "level": "Klasse",
    "tenderNedCompatible": true
  },
  {
    "code": "90511200-4",
    "coreCode": "90511200",
    "checkDigit": 4,
    "description": "Ophalen van huisvuil",
    "level": "Klasse",
    "tenderNedCompatible": true
  },
  {
    "code": "90511300-5",
    "coreCode": "90511300",
    "checkDigit": 5,
    "description": "Diensten voor het verzamelen van straatafval",
    "level": "Klasse",
    "tenderNedCompatible": true
  },
  {
    "code": "90511400-6",
    "coreCode": "90511400",
    "checkDigit": 6,
    "description": "Diensten voor het verzamelen van oud papier",
    "level": "Klasse",
    "tenderNedCompatible": true
  },
  {
    "code": "90512000-9",
    "coreCode": "90512000",
    "checkDigit": 9,
    "description": "Diensten voor afvalvervoer",
    "level": "Klasse",
    "tenderNedCompatible": true
  },
  {
    "code": "90513000-6",
    "coreCode": "90513000",
    "checkDigit": 6,
    "description": "Diensten voor het verwerken en storten van ongevaarlijk afval en vuilnis",
    "level": "Klasse",
    "tenderNedCompatible": true
  },
  {
    "code": "90513100-7",
    "coreCode": "90513100",
    "checkDigit": 7,
    "description": "Verwijderen van huisvuil",
    "level": "Klasse",
    "tenderNedCompatible": true
  },
  {
    "code": "90513200-8",
    "coreCode": "90513200",
    "checkDigit": 8,
    "description": "Verwijderen van vast stadsafval",
    "level": "Klasse",
    "tenderNedCompatible": true
  },
  {
    "code": "90513300-9",
    "coreCode": "90513300",
    "checkDigit": 9,
    "description": "Diensten voor afvalverbranding",
    "level": "Klasse",
    "tenderNedCompatible": true
  },
  {
    "code": "90513400-0",
    "coreCode": "90513400",
    "checkDigit": 0,
    "description": "Diensten voor het verwerken van as",
    "level": "Klasse",
    "tenderNedCompatible": true
  },
  {
    "code": "90513500-1",
    "coreCode": "90513500",
    "checkDigit": 1,
    "description": "Behandeling en verwijdering van gevaarlijke vloeistoffen",
    "level": "Klasse",
    "tenderNedCompatible": true
  },
  {
    "code": "80211000-6",
    "coreCode": "80211000",
    "checkDigit": 6,
    "description": "Diensten voor voorgezet technisch onderwijs",
    "level": "Klasse",
    "tenderNedCompatible": true
  },
  {
    "code": "80212000-3",
    "coreCode": "80212000",
    "checkDigit": 3,
    "description": "Diensten voor voortgezet beroepsonderwijs",
    "level": "Klasse",
    "tenderNedCompatible": true
  },
  {
    "code": "80411000-8",
    "coreCode": "80411000",
    "checkDigit": 8,
    "description": "Autorijschooldiensten",
    "level": "Klasse",
    "tenderNedCompatible": true
  },
  {
    "code": "80411100-9",
    "coreCode": "80411100",
    "checkDigit": 9,
    "description": "Rijexamendiensten",
    "level": "Klasse",
    "tenderNedCompatible": true
  },
  {
    "code": "80411200-0",
    "coreCode": "80411200",
    "checkDigit": 0,
    "description": "Rijlessen",
    "level": "Klasse",
    "tenderNedCompatible": true
  },
  {
    "code": "80412000-5",
    "coreCode": "80412000",
    "checkDigit": 5,
    "description": "Vliegschooldiensten",
    "level": "Klasse",
    "tenderNedCompatible": true
  },
  {
    "code": "80413000-2",
    "coreCode": "80413000",
    "checkDigit": 2,
    "description": "Vaarschooldiensten",
    "level": "Klasse",
    "tenderNedCompatible": true
  },
  {
    "code": "80414000-9",
    "coreCode": "80414000",
    "checkDigit": 9,
    "description": "Duikschooldiensten",
    "level": "Klasse",
    "tenderNedCompatible": true
  },
  {
    "code": "80415000-6",
    "coreCode": "80415000",
    "checkDigit": 6,
    "description": "Skilesdiensten",
    "level": "Klasse",
    "tenderNedCompatible": true
  },
  {
    "code": "80511000-9",
    "coreCode": "80511000",
    "checkDigit": 9,
    "description": "Stafopleidingsdiensten",
    "level": "Klasse",
    "tenderNedCompatible": true
  },
  {
    "code": "80512000-6",
    "coreCode": "80512000",
    "checkDigit": 6,
    "description": "Hondentrainigsdiensten",
    "level": "Klasse",
    "tenderNedCompatible": true
  },
  {
    "code": "80513000-3",
    "coreCode": "80513000",
    "checkDigit": 3,
    "description": "Manegediensten",
    "level": "Klasse",
    "tenderNedCompatible": true
  },
  {
    "code": "80521000-2",
    "coreCode": "80521000",
    "checkDigit": 2,
    "description": "Diensten voor opleidingsprogramma",
    "level": "Klasse",
    "tenderNedCompatible": true
  },
  {
    "code": "80522000-9",
    "coreCode": "80522000",
    "checkDigit": 9,
    "description": "Opleidingsseminars",
    "level": "Klasse",
    "tenderNedCompatible": true
  },
  {
    "code": "80531000-5",
    "coreCode": "80531000",
    "checkDigit": 5,
    "description": "Diensten voor industriële en technische opleiding",
    "level": "Klasse",
    "tenderNedCompatible": true
  },
  {
    "code": "60112000-6",
    "coreCode": "60112000",
    "checkDigit": 6,
    "description": "Openbaarvervoersdiensten",
    "level": "Klasse",
    "tenderNedCompatible": true
  },
  {
    "code": "60161000-4",
    "coreCode": "60161000",
    "checkDigit": 4,
    "description": "Pakketvervoer",
    "level": "Klasse",
    "tenderNedCompatible": true
  },
  {
    "code": "60171000-7",
    "coreCode": "60171000",
    "checkDigit": 7,
    "description": "Verhuur van personenauto's met chauffeur",
    "level": "Klasse",
    "tenderNedCompatible": true
  },
  {
    "code": "60172000-4",
    "coreCode": "60172000",
    "checkDigit": 4,
    "description": "Bus- en autobusverhuur met chauffeur",
    "level": "Klasse",
    "tenderNedCompatible": true
  },
  {
    "code": "60181000-0",
    "coreCode": "60181000",
    "checkDigit": 0,
    "description": "Verhuur van vrachtwagens met chauffeur",
    "level": "Klasse",
    "tenderNedCompatible": true
  },
  {
    "code": "60182000-7",
    "coreCode": "60182000",
    "checkDigit": 7,
    "description": "Verhuur van industriële voertuigen met chauffeur",
    "level": "Klasse",
    "tenderNedCompatible": true
  },
  {
    "code": "60183000-4",
    "coreCode": "60183000",
    "checkDigit": 4,
    "description": "Bestelwagenverhuur met chauffeur",
    "level": "Klasse",
    "tenderNedCompatible": true
  },
  {
    "code": "60411000-2",
    "coreCode": "60411000",
    "checkDigit": 2,
    "description": "Diensten voor luchtpostvervoer volgens dienstregeling",
    "level": "Klasse",
    "tenderNedCompatible": true
  },
  {
    "code": "60421000-5",
    "coreCode": "60421000",
    "checkDigit": 5,
    "description": "Diensten voor luchtpostvervoer zonder dienstregeling",
    "level": "Klasse",
    "tenderNedCompatible": true
  },
  {
    "code": "60423000-9",
    "coreCode": "60423000",
    "checkDigit": 9,
    "description": "Vliegtuigcharterdiensten",
    "level": "Klasse",
    "tenderNedCompatible": true
  },
  {
    "code": "60424000-6",
    "coreCode": "60424000",
    "checkDigit": 6,
    "description": "Verhuur van transportmiddelen voor luchtvervoer met bemanning",
    "level": "Klasse",
    "tenderNedCompatible": true
  },
  {
    "code": "60424100-7",
    "coreCode": "60424100",
    "checkDigit": 7,
    "description": "Verhuur van luchtvaartuigen met bemanning",
    "level": "Klasse",
    "tenderNedCompatible": true
  },
  {
    "code": "60424110-0",
    "coreCode": "60424110",
    "checkDigit": 0,
    "description": "Verhuur van vliegtuigen met bemanning",
    "level": "Categorie",
    "tenderNedCompatible": true
  },
  {
    "code": "60424120-3",
    "coreCode": "60424120",
    "checkDigit": 3,
    "description": "Verhuur van helikopters met bemanning",
    "level": "Categorie",
    "tenderNedCompatible": true
  },
  {
    "code": "60441000-1",
    "coreCode": "60441000",
    "checkDigit": 1,
    "description": "Sproeien vanuit vliegtuigen",
    "level": "Klasse",
    "tenderNedCompatible": true
  },
  {
    "code": "79620000-6",
    "coreCode": "79620000",
    "checkDigit": 6,
    "description": "Diensten voor de terbeschikkingstelling van personeel, met inbegrip van tijdelijk personeel",
    "level": "Groep",
    "tenderNedCompatible": false
  },
  {
    "code": "45000000-7",
    "coreCode": "45000000",
    "checkDigit": 7,
    "description": "Bouwwerkzaamheden",
    "level": "Divisie",
    "tenderNedCompatible": false
  },
  {
    "code": "72000000-5",
    "coreCode": "72000000",
    "checkDigit": 5,
    "description": "IT-diensten: adviezen, softwareontwikkeling, internet en ondersteuning",
    "level": "Divisie",
    "tenderNedCompatible": false
  },
  {
    "code": "77000000-0",
    "coreCode": "77000000",
    "checkDigit": 0,
    "description": "Diensten voor land-, bos- en tuinbouw, aquicultuur en imkerij",
    "level": "Divisie",
    "tenderNedCompatible": false
  },
  {
    "code": "71000000-8",
    "coreCode": "71000000",
    "checkDigit": 8,
    "description": "Dienstverlening op het gebied van architectuur, bouwkunde, civiele techniek en inspectie",
    "level": "Divisie",
    "tenderNedCompatible": false
  }
];

export function searchCPVCodes(query: string): CPVCode[] {
  if (!query || query.length < 2) return CPV_CODES_TOP.slice(0, 20);
  
  const lowerQuery = query.toLowerCase();
  return CPV_CODES_TOP.filter(cpv => 
    cpv.description.toLowerCase().includes(lowerQuery) || 
    cpv.code.includes(query) ||
    cpv.coreCode.includes(query)
  ).slice(0, 20);
}

export function getSectorFromCPV(code: string): string | null {
  if (!code || code.length < 2) return null;
  
  const prefix = code.substring(0, 2);
  const sectorMap: Record<string, string> = {
    '45': 'Bouw & Civiel',
    '71': 'Architectuur & Ingenieurs',
    '72': 'IT-diensten',
    '77': 'Landbouw',
    '79': 'Zakelijke Diensten',
    '85': 'Zorg & Sociaal',
    '90': 'Milieu & Afval',
    '80': 'Onderwijs',
    '60': 'Transport',
    '55': 'Horeca & Catering',
  };
  
  return sectorMap[prefix] || null;
}
