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
    "code": "45000000-7",
    "coreCode": "45000000",
    "checkDigit": 7,
    "description": "Bouwwerkzaamheden",
    "level": "Divisie",
    "tenderNedCompatible": true
  },
  {
    "code": "45100000-8",
    "coreCode": "45100000",
    "checkDigit": 8,
    "description": "Bouwrijp maken van terreinen",
    "level": "Groep",
    "tenderNedCompatible": true
  },
  {
    "code": "45110000-1",
    "coreCode": "45110000",
    "checkDigit": 1,
    "description": "Slopen en ontmantelen van gebouwen, en grondverzet",
    "level": "Groep",
    "tenderNedCompatible": true
  },
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
    "code": "71000000-8",
    "coreCode": "71000000",
    "checkDigit": 8,
    "description": "Dienstverlening op het gebied van architectuur, bouwkunde, civiele techniek en inspectie",
    "level": "Divisie",
    "tenderNedCompatible": true
  },
  {
    "code": "71200000-0",
    "coreCode": "71200000",
    "checkDigit": 0,
    "description": "Dienstverlening op het gebied van architectuur en dergelijke",
    "level": "Groep",
    "tenderNedCompatible": true
  },
  {
    "code": "71210000-3",
    "coreCode": "71210000",
    "checkDigit": 3,
    "description": "Architectonische adviezen",
    "level": "Groep",
    "tenderNedCompatible": true
  },
  {
    "code": "71220000-6",
    "coreCode": "71220000",
    "checkDigit": 6,
    "description": "Maken van bouwkundige ontwerpen",
    "level": "Groep",
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
    "code": "71230000-9",
    "coreCode": "71230000",
    "checkDigit": 9,
    "description": "Organisatie van een architectenprijsvraag",
    "level": "Groep",
    "tenderNedCompatible": true
  },
  {
    "code": "71240000-2",
    "coreCode": "71240000",
    "checkDigit": 2,
    "description": "Dienstverlening op het gebied van architectuur, bouwkunde en planning",
    "level": "Groep",
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
    "code": "72000000-5",
    "coreCode": "72000000",
    "checkDigit": 5,
    "description": "IT-diensten: adviezen, softwareontwikkeling, internet en ondersteuning",
    "level": "Divisie",
    "tenderNedCompatible": true
  },
  {
    "code": "72100000-6",
    "coreCode": "72100000",
    "checkDigit": 6,
    "description": "Advies inzake hardware",
    "level": "Groep",
    "tenderNedCompatible": true
  },
  {
    "code": "72110000-9",
    "coreCode": "72110000",
    "checkDigit": 9,
    "description": "Advies inzake hardwarekeuze",
    "level": "Groep",
    "tenderNedCompatible": true
  },
  {
    "code": "72120000-2",
    "coreCode": "72120000",
    "checkDigit": 2,
    "description": "Advies inzake calamiteitenherstel bij hardware",
    "level": "Groep",
    "tenderNedCompatible": true
  },
  {
    "code": "72130000-5",
    "coreCode": "72130000",
    "checkDigit": 5,
    "description": "Advies over planning computerlocatie",
    "level": "Groep",
    "tenderNedCompatible": true
  },
  {
    "code": "72140000-8",
    "coreCode": "72140000",
    "checkDigit": 8,
    "description": "Advies over acceptatietest computerhardware",
    "level": "Groep",
    "tenderNedCompatible": true
  },
  {
    "code": "72150000-1",
    "coreCode": "72150000",
    "checkDigit": 1,
    "description": "Advies over computeraudit en -hardware",
    "level": "Groep",
    "tenderNedCompatible": true
  },
  {
    "code": "72200000-7",
    "coreCode": "72200000",
    "checkDigit": 7,
    "description": "Softwareprogrammering en -advies",
    "level": "Groep",
    "tenderNedCompatible": true
  },
  {
    "code": "72210000-0",
    "coreCode": "72210000",
    "checkDigit": 0,
    "description": "Programmering van softwarepakketten",
    "level": "Groep",
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
    "code": "77000000-0",
    "coreCode": "77000000",
    "checkDigit": 0,
    "description": "Diensten voor land-, bos- en tuinbouw, aquicultuur en imkerij",
    "level": "Divisie",
    "tenderNedCompatible": true
  },
  {
    "code": "77100000-1",
    "coreCode": "77100000",
    "checkDigit": 1,
    "description": "Diensten voor de landbouw",
    "level": "Groep",
    "tenderNedCompatible": true
  },
  {
    "code": "77110000-4",
    "coreCode": "77110000",
    "checkDigit": 4,
    "description": "Diensten in verband met landbouwproductie",
    "level": "Groep",
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
    "code": "77120000-7",
    "coreCode": "77120000",
    "checkDigit": 7,
    "description": "Composteerdiensten",
    "level": "Groep",
    "tenderNedCompatible": true
  },
  {
    "code": "77200000-2",
    "coreCode": "77200000",
    "checkDigit": 2,
    "description": "Bosbouwdiensten",
    "level": "Groep",
    "tenderNedCompatible": true
  },
  {
    "code": "77210000-5",
    "coreCode": "77210000",
    "checkDigit": 5,
    "description": "Houtwinning",
    "level": "Groep",
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
    "code": "79000000-4",
    "coreCode": "79000000",
    "checkDigit": 4,
    "description": "Zakelijke dienstverlening: juridisch, marketing, consulting, drukkerij en beveiliging",
    "level": "Divisie",
    "tenderNedCompatible": true
  },
  {
    "code": "79100000-5",
    "coreCode": "79100000",
    "checkDigit": 5,
    "description": "Juridische dienstverlening",
    "level": "Groep",
    "tenderNedCompatible": true
  },
  {
    "code": "79110000-8",
    "coreCode": "79110000",
    "checkDigit": 8,
    "description": "Juridisch advies en juridische vertegenwoordiging",
    "level": "Groep",
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
    "code": "79120000-1",
    "coreCode": "79120000",
    "checkDigit": 1,
    "description": "Adviezen inzake octrooien en auteursrechten",
    "level": "Groep",
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
    "code": "79130000-4",
    "coreCode": "79130000",
    "checkDigit": 4,
    "description": "Juridische documentatie en certificering",
    "level": "Groep",
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
    "code": "79140000-7",
    "coreCode": "79140000",
    "checkDigit": 7,
    "description": "Juridische adviezen en informatie",
    "level": "Groep",
    "tenderNedCompatible": true
  },
  {
    "code": "79200000-6",
    "coreCode": "79200000",
    "checkDigit": 6,
    "description": "Boekhoudkundige, audit- en fiscale diensten",
    "level": "Groep",
    "tenderNedCompatible": true
  },
  {
    "code": "85000000-9",
    "coreCode": "85000000",
    "checkDigit": 9,
    "description": "Gezondheidszorg en maatschappelijk werk",
    "level": "Divisie",
    "tenderNedCompatible": true
  },
  {
    "code": "85100000-0",
    "coreCode": "85100000",
    "checkDigit": 0,
    "description": "Gezondheidsdiensten",
    "level": "Groep",
    "tenderNedCompatible": true
  },
  {
    "code": "85110000-3",
    "coreCode": "85110000",
    "checkDigit": 3,
    "description": "Ziekenhuis- en aanverwante diensten",
    "level": "Groep",
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
    "code": "90000000-7",
    "coreCode": "90000000",
    "checkDigit": 7,
    "description": "Diensten inzake afvalwater, afval, reiniging en milieu",
    "level": "Divisie",
    "tenderNedCompatible": true
  },
  {
    "code": "90400000-1",
    "coreCode": "90400000",
    "checkDigit": 1,
    "description": "Diensten in verband met afvalwater",
    "level": "Groep",
    "tenderNedCompatible": true
  },
  {
    "code": "90410000-4",
    "coreCode": "90410000",
    "checkDigit": 4,
    "description": "Rioolwaterverwijderingsdiensten",
    "level": "Groep",
    "tenderNedCompatible": true
  },
  {
    "code": "90420000-7",
    "coreCode": "90420000",
    "checkDigit": 7,
    "description": "Rioolwaterbehandelingsdiensten",
    "level": "Groep",
    "tenderNedCompatible": true
  },
  {
    "code": "90430000-0",
    "coreCode": "90430000",
    "checkDigit": 0,
    "description": "Rioolwaterafvoerdiensten",
    "level": "Groep",
    "tenderNedCompatible": true
  },
  {
    "code": "90440000-3",
    "coreCode": "90440000",
    "checkDigit": 3,
    "description": "Diensten voor behandeling van beerputten",
    "level": "Groep",
    "tenderNedCompatible": true
  },
  {
    "code": "90450000-6",
    "coreCode": "90450000",
    "checkDigit": 6,
    "description": "Diensten voor behandeling van septische putten",
    "level": "Groep",
    "tenderNedCompatible": true
  },
  {
    "code": "90460000-9",
    "coreCode": "90460000",
    "checkDigit": 9,
    "description": "Diensten voor het ledigen van beerputten of septische putten",
    "level": "Groep",
    "tenderNedCompatible": true
  },
  {
    "code": "90470000-2",
    "coreCode": "90470000",
    "checkDigit": 2,
    "description": "Diensten voor rioolreiniging",
    "level": "Groep",
    "tenderNedCompatible": true
  },
  {
    "code": "90480000-5",
    "coreCode": "90480000",
    "checkDigit": 5,
    "description": "Beheer van riolering",
    "level": "Groep",
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
    "code": "90490000-8",
    "coreCode": "90490000",
    "checkDigit": 8,
    "description": "Adviesdiensten inzake rioolinspectie en rioolwaterbehandeling",
    "level": "Groep",
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
    "code": "90500000-2",
    "coreCode": "90500000",
    "checkDigit": 2,
    "description": "Diensten op het gebied van vuilnis en afval",
    "level": "Groep",
    "tenderNedCompatible": true
  },
  {
    "code": "80000000-4",
    "coreCode": "80000000",
    "checkDigit": 4,
    "description": "Diensten voor onderwijs en opleiding",
    "level": "Divisie",
    "tenderNedCompatible": true
  },
  {
    "code": "80100000-5",
    "coreCode": "80100000",
    "checkDigit": 5,
    "description": "Diensten voor basisonderwijs",
    "level": "Groep",
    "tenderNedCompatible": true
  },
  {
    "code": "80110000-8",
    "coreCode": "80110000",
    "checkDigit": 8,
    "description": "Diensten voor kleuteronderwijs",
    "level": "Groep",
    "tenderNedCompatible": true
  },
  {
    "code": "80200000-6",
    "coreCode": "80200000",
    "checkDigit": 6,
    "description": "Diensten voor secundair onderwijs",
    "level": "Groep",
    "tenderNedCompatible": true
  },
  {
    "code": "80210000-9",
    "coreCode": "80210000",
    "checkDigit": 9,
    "description": "Diensten voor voortgezet technisch en beroepsonderwijs",
    "level": "Groep",
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
    "code": "80300000-7",
    "coreCode": "80300000",
    "checkDigit": 7,
    "description": "Diensten voor hoger onderwijs",
    "level": "Groep",
    "tenderNedCompatible": true
  },
  {
    "code": "80310000-0",
    "coreCode": "80310000",
    "checkDigit": 0,
    "description": "Diensten voor onderwijs voor jongeren",
    "level": "Groep",
    "tenderNedCompatible": true
  },
  {
    "code": "80320000-3",
    "coreCode": "80320000",
    "checkDigit": 3,
    "description": "Diensten voor medisch onderwijs",
    "level": "Groep",
    "tenderNedCompatible": true
  },
  {
    "code": "80330000-6",
    "coreCode": "80330000",
    "checkDigit": 6,
    "description": "Diensten voor veiligheidsonderricht",
    "level": "Groep",
    "tenderNedCompatible": true
  },
  {
    "code": "80340000-9",
    "coreCode": "80340000",
    "checkDigit": 9,
    "description": "Diensten voor bijzonder onderwijs",
    "level": "Groep",
    "tenderNedCompatible": true
  },
  {
    "code": "80400000-8",
    "coreCode": "80400000",
    "checkDigit": 8,
    "description": "Volwasseneneducatie en andere vormen van onderwijs",
    "level": "Groep",
    "tenderNedCompatible": true
  },
  {
    "code": "80410000-1",
    "coreCode": "80410000",
    "checkDigit": 1,
    "description": "Diverse schooldiensten",
    "level": "Groep",
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
    "code": "60000000-8",
    "coreCode": "60000000",
    "checkDigit": 8,
    "description": "Vervoersdiensten (uitg. vervoer van afval)",
    "level": "Divisie",
    "tenderNedCompatible": true
  },
  {
    "code": "60100000-9",
    "coreCode": "60100000",
    "checkDigit": 9,
    "description": "Wegvervoersdiensten",
    "level": "Groep",
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
    "code": "60120000-5",
    "coreCode": "60120000",
    "checkDigit": 5,
    "description": "Taxidiensten",
    "level": "Groep",
    "tenderNedCompatible": true
  },
  {
    "code": "60130000-8",
    "coreCode": "60130000",
    "checkDigit": 8,
    "description": "Diensten voor speciaal personenvervoer over land",
    "level": "Groep",
    "tenderNedCompatible": true
  },
  {
    "code": "60140000-1",
    "coreCode": "60140000",
    "checkDigit": 1,
    "description": "Personenvervoer zonder dienstregeling",
    "level": "Groep",
    "tenderNedCompatible": true
  },
  {
    "code": "60150000-4",
    "coreCode": "60150000",
    "checkDigit": 4,
    "description": "Personenvervoer met door dieren getrokken voertuigen",
    "level": "Groep",
    "tenderNedCompatible": true
  },
  {
    "code": "60160000-7",
    "coreCode": "60160000",
    "checkDigit": 7,
    "description": "Postvervoer over de weg",
    "level": "Groep",
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
    "code": "60170000-0",
    "coreCode": "60170000",
    "checkDigit": 0,
    "description": "Verhuur van voertuigen voor personenvervoer met chauffeur",
    "level": "Groep",
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
    "code": "60180000-3",
    "coreCode": "60180000",
    "checkDigit": 3,
    "description": "Verhuur van voertuigen voor goederenvervoer met chauffeur",
    "level": "Groep",
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
    "code": "79620000-6",
    "coreCode": "79620000",
    "checkDigit": 6,
    "description": "Diensten voor de terbeschikkingstelling van personeel, met inbegrip van tijdelijk personeel",
    "level": "Groep",
    "tenderNedCompatible": true
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
